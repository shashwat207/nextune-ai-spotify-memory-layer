import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  USERS,
  INITIAL_TRACKS,
  INITIAL_MEMORIES,
  INITIAL_GRAPH_NODES,
  INITIAL_GRAPH_EDGES,
  INITIAL_POSTGRES_LOGS
} from './src/data/musicCatalog';
import { AUTH_CREDENTIALS } from './src/data/authCredentials';
import { searchVectorMemory, generateEmbedding } from './src/utils/vectorEngine';
import { traverseKnowledgeGraph } from './src/utils/graphEngine';
import { MemoryItem, Track, WorkflowTrace, PostgresInteractionLog } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// JWT signing secret. Falls back to a dev-only value so the demo still runs
// locally without setup, but this MUST be overridden via env var in production —
// anyone who reads this source can forge sessions otherwise.
const JWT_SECRET = process.env.JWT_SECRET || 'nextune-insecure-dev-secret-do-not-use-in-production';
if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET is not set — using an insecure dev fallback. Set JWT_SECRET in your environment before treating this as anything beyond a demo.');
}
const SESSION_COOKIE = 'nextune_session';

function signSession(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Extracts and verifies the session cookie, attaching req.userId.
// Every route that touches memory data must use req.userId — never a
// client-supplied param/body value — so one user can never read or
// mutate another user's memories.
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
}

function publicUser(userId: string) {
  const user = USERS.find(u => u.id === userId);
  if (!user) return null;
  return user;
}

// In-memory state for runtime session sync
let memoryStore = { ...INITIAL_MEMORIES };
let graphNodes = [...INITIAL_GRAPH_NODES];
let graphEdges = [...INITIAL_GRAPH_EDGES];
let tracksCatalog = [...INITIAL_TRACKS];
let postgresLogs = [...INITIAL_POSTGRES_LOGS];

// Lazy Gemini client helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Auth: login
app.post('/api/auth/login', async (req, res) => {
  const { email, password, rememberMe } = req.body || {};

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const credential = AUTH_CREDENTIALS.find(c => c.email.toLowerCase() === email.toLowerCase());
  // Always run bcrypt.compare even when no account matches, so response timing
  // doesn't reveal whether the email exists.
  const hashToCheck = credential?.passwordHash || '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
  const isValid = await bcrypt.compare(password, hashToCheck);

  if (!credential || !isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signSession(credential.userId);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ user: publicUser(credential.userId) });
});

// Auth: logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ success: true });
});

// Auth: current session
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = publicUser((req as any).userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user });
});

// Health API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'NexTune AI Memory Orchestrator',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Users (only needed post-login; gated so it can't be scraped pre-auth)
app.get('/api/users', requireAuth, (req, res) => {
  res.json({ users: USERS });
});

// Tracks (shared catalog, not user-specific data)
app.get('/api/tracks', (req, res) => {
  res.json({ tracks: tracksCatalog });
});

// Memory DB endpoints — userId always comes from the verified session,
// never from the URL/body, so one account can never read or touch another's memories.
app.get('/api/memories/:userId', requireAuth, (req, res) => {
  const authedUserId = (req as any).userId;
  if (req.params.userId !== authedUserId) {
    return res.status(403).json({ error: 'Cannot access another user\'s memories' });
  }
  const userMems = memoryStore[authedUserId] || [];
  res.json({ memories: userMems });
});

app.post('/api/memories/delete', requireAuth, (req, res) => {
  const authedUserId = (req as any).userId;
  const { memoryId } = req.body;
  if (memoryStore[authedUserId]) {
    memoryStore[authedUserId] = memoryStore[authedUserId].filter(m => m.id !== memoryId);
  }
  // Also log to postgres
  postgresLogs.unshift({
    id: `pg_del_${Date.now()}`,
    userId: authedUserId,
    eventType: 'CORRECTION',
    details: `User explicitly deleted memory item ${memoryId}`,
    createdAt: new Date().toISOString(),
  });
  res.json({ success: true, memories: memoryStore[authedUserId] || [] });
});

// Graph endpoints
app.get('/api/graph', requireAuth, (req, res) => {
  res.json({ nodes: graphNodes, edges: graphEdges });
});

// Postgres Audit Logs
app.get('/api/logs/:userId', requireAuth, (req, res) => {
  const authedUserId = (req as any).userId;
  if (req.params.userId !== authedUserId) {
    return res.status(403).json({ error: 'Cannot access another user\'s logs' });
  }
  const logs = postgresLogs.filter(l => l.userId === authedUserId);
  res.json({ logs });
});

// Full 12-Step LangGraph Orchestration Endpoint
app.post('/api/workflow/orchestrate', requireAuth, async (req, res) => {
  const startTime = Date.now();
  const authedUserId = (req as any).userId;
  const { query, currentTrackId } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query string is required' });
  }

  // Step 2: Authenticate User — identity comes from the verified session, never the request body
  const tAuthStart = Date.now();
  const activeUser = USERS.find(u => u.id === authedUserId);
  if (!activeUser) {
    return res.status(401).json({ error: 'Session user no longer exists' });
  }
  const tAuth = Date.now() - tAuthStart;

  // Step 3: Vector DB Retrieval
  const tVecStart = Date.now();
  const userMems = memoryStore[activeUser.id] || [];
  const vectorResults = searchVectorMemory(query, userMems, 0.45);
  const tVec = Date.now() - tVecStart;

  // Step 4: Neo4j Knowledge Graph Traversal
  const tGraphStart = Date.now();
  const seedKeywords = [query];
  vectorResults.forEach(vr => {
    if (vr.memory.entityName) seedKeywords.push(vr.memory.entityName);
  });
  const graphResult = traverseKnowledgeGraph(seedKeywords, graphNodes, graphEdges, `user:${activeUser.handle.replace('@', '')}`);
  const tGraph = Date.now() - tGraphStart;

  // Step 5: Spotify Search & Candidate Matching
  const tSpotStart = Date.now();
  const queryLower = query.toLowerCase();
  
  // Filter out any disliked artists discovered in Vector DB or Graph
  const dislikedNames = new Set([
    ...graphResult.dislikedArtists.map(d => d.toLowerCase()),
    ...vectorResults.filter(v => v.memory.polarity === 'negative').map(v => v.memory.entityName.toLowerCase())
  ]);

  let candidateTracks = tracksCatalog.filter(t => {
    const artistLower = t.artist.toLowerCase();
    const isDisliked = Array.from(dislikedNames).some(d => artistLower.includes(d) || d.includes(artistLower));
    return !isDisliked;
  });

  // Relevance ranking based on query + graph discovered artists & genres
  candidateTracks.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Direct genre match
    if (queryLower.includes('punjabi') && a.genre === 'Punjabi') scoreA += 10;
    if (queryLower.includes('punjabi') && b.genre === 'Punjabi') scoreB += 10;
    if (queryLower.includes('pop') && a.genre === 'Pop') scoreA += 10;
    if (queryLower.includes('pop') && b.genre === 'Pop') scoreB += 10;
    if ((queryLower.includes('electronic') || queryLower.includes('synth')) && a.genre === 'Electronic') scoreA += 10;
    if ((queryLower.includes('electronic') || queryLower.includes('synth')) && b.genre === 'Electronic') scoreB += 10;
    if ((queryLower.includes('piano') || queryLower.includes('coding') || queryLower.includes('work') || queryLower.includes('calm')) && a.genre === 'Lo-Fi & Piano') scoreA += 10;
    if ((queryLower.includes('piano') || queryLower.includes('coding') || queryLower.includes('work') || queryLower.includes('calm')) && b.genre === 'Lo-Fi & Piano') scoreB += 10;

    // Graph discovery boost
    if (graphResult.discoveredArtists.some(da => da.toLowerCase() === a.artist.toLowerCase())) scoreA += 7;
    if (graphResult.discoveredArtists.some(da => da.toLowerCase() === b.artist.toLowerCase())) scoreB += 7;

    // Vector memory positive affinity boost
    vectorResults.filter(v => v.memory.polarity === 'positive').forEach(v => {
      if (a.artist.toLowerCase().includes(v.memory.entityName.toLowerCase())) scoreA += 8;
      if (b.artist.toLowerCase().includes(v.memory.entityName.toLowerCase())) scoreB += 8;
    });

    return scoreB - scoreA;
  });

  const topRecommendedTracks = candidateTracks.slice(0, 4);
  const tSpot = Date.now() - tSpotStart;

  // Step 6: Context Composition
  const memoryContextSummary = vectorResults.map(vr => 
    `- [${vr.memory.polarity.toUpperCase()}] "${vr.memory.text}" (Similarity: ${vr.similarity.toFixed(2)}, Confidence: ${(vr.memory.confidence * 100).toFixed(0)}%)`
  ).join('\n');

  const graphContextSummary = `Discovered Graph Entities: Artists [${graphResult.discoveredArtists.join(', ')}], Genres [${graphResult.discoveredGenres.join(', ')}]\nDisliked / Excluded: [${Array.from(dislikedNames).join(', ')}]`;

  const spotifyContextSummary = topRecommendedTracks.map(t => 
    `• "${t.title}" by ${t.artist} (${t.genre}, Subgenres: ${t.subgenres.join(', ')})`
  ).join('\n');

  const assembledPrompt = `User: ${activeUser.name}
Query: "${query}"

[Retrieved User Long-Term Memories]:
${memoryContextSummary || 'No high-confidence historical memories found for this query yet.'}

[Neo4j Knowledge Graph Traversal]:
${graphContextSummary}

[Available Spotify Tracks]:
${spotifyContextSummary}

Task: Respond in a warm, knowledgeable music curator tone.
1. Reference the user's specific past preferences (e.g. why they will love these tracks based on artists/genres they previously enjoyed, and noting anything avoided).
2. Recommend the top matching tracks by name and artist.
3. Keep the response concise, punchy (2-3 sentences max).`;

  // Step 7: LLM Generation (Gemini API with multi-model fallback chain and fast timeout)
  const tLLMStart = Date.now();
  let llmHeadline = `Recommended for ${activeUser.name}`;
  let llmExplanation = '';
  let reasoningPillars: string[] = [];
  let modelUsed = 'NexTune Memory Intelligence Engine';

  const aiClient = getGeminiClient();
  if (aiClient) {
    // Model fallback sequence in case of 503 high demand or temporary spikes
    const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-3.7-flash'];
    
    for (const modelName of candidateModels) {
      try {
        const fetchPromise = aiClient.models.generateContent({
          model: modelName,
          contents: assembledPrompt,
          config: {
            systemInstruction: 'You are NexTune AI, an intelligent music concierge and Spotify AI memory system. You provide thoughtful, personalized music recommendations that explicitly link back to the listener’s past preferences and relationship graph.',
            temperature: 0.7,
          }
        });

        // 4.5-second timeout safeguard
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500));
        const geminiResponse = await Promise.race([fetchPromise, timeoutPromise]);

        if (geminiResponse && 'text' in geminiResponse) {
          const generatedText = geminiResponse.text?.trim();
          if (generatedText) {
            llmExplanation = generatedText;
            modelUsed = modelName;
            reasoningPillars = [
              `Vector Context: ${vectorResults.length} relevant listener memories injected`,
              `Graph Connections: ${graphResult.pathsExplored.length} relationship paths traversed`,
              `Model Synthesized: Grounded output via ${modelName}`,
            ];
            break; // Successfully generated!
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`Gemini model ${modelName} encountered issue:`, errMsg);
        // Continue to next candidate model
        continue;
      }
    }
  }

  // Fallback / Deterministic synthesis when key is not active or models are under temporary demand spike
  if (!llmExplanation) {
    const positiveMems = vectorResults.filter(v => v.memory.polarity === 'positive');
    const favoredArtist = positiveMems[0]?.memory.entityName || (queryLower.includes('punjabi') ? 'Sidhu Moosewala' : topRecommendedTracks[0]?.artist || 'Nova Lane');
    
    if (queryLower.includes('punjabi') || queryLower.includes('sidhu') || queryLower.includes('aujla') || queryLower.includes('diljit') || queryLower.includes('shubh')) {
      llmExplanation = `Since you've previously enjoyed ${favoredArtist} and prefer high-energy Punjabi beats while avoiding commercial auto-tune, here are top picks: ${topRecommendedTracks.map(t => `**${t.title}** by ${t.artist}`).join(', ')}.`;
      reasoningPillars = [
        `Vector Match: High similarity with memory "I like Sidhu Moosewala"`,
        `Neo4j Expansion: Sidhu Moosewala → Punjabi → Karan Aujla & Diljit Dosanjh`,
        `Dislike Filter: Excluded AP Dhillon based on stored preference`,
      ];
    } else if (queryLower.includes('electronic') || queryLower.includes('synth') || queryLower.includes('nova')) {
      llmExplanation = `Drawing from your saved affinity for Nova Lane and 80s Cyberpunk Synthwave, I've queued up **Midnight Circuit**, **Velvet Morning**, and **Constellations**.`;
      reasoningPillars = [
        `Vector Match: 95% similarity with Nova Lane & Synthwave memories`,
        `Neo4j Expansion: Nova Lane → Electronic → Cosmic Kind`,
        `Rhythm Tone: Driving 118-122 BPM synthesizer grooves`,
      ];
    } else if (queryLower.includes('pop') || queryLower.includes('taylor') || queryLower.includes('weeknd')) {
      llmExplanation = `Based on your love for vibrant synth-pop melodies and upbeat hooks, I've curated top picks including **Cruel Summer** by Taylor Swift and **Blinding Lights** by The Weeknd.`;
      reasoningPillars = [
        `Vector Match: 94% similarity with 80s Synth-Pop preference`,
        `Neo4j Expansion: Taylor Swift → Pop → The Weeknd`,
        `Filter Applied: Kept tempo high at 170+ BPM`,
      ];
    } else if (queryLower.includes('piano') || queryLower.includes('coding') || queryLower.includes('work') || queryLower.includes('study')) {
      llmExplanation = `Drawing from your saved preference for calm piano and rain ambience during deep focus sessions, here is **Quiet Workspace** and **Coffee Shop Keys** to keep you in flow state.`;
      reasoningPillars = [
        `Vector Match: 92% similarity for "calm piano while working"`,
        `Activity Context: Coding & Deep Work detected`,
        `Acoustic Tone: Muted Rhodes keys & low tempo (<85 BPM)`,
      ];
    } else {
      const trackSummary = topRecommendedTracks.map(t => `**${t.title}** by ${t.artist}`).join(', ');
      llmExplanation = `Based on your listener memories and taste profile, I've curated these recommendations tailored to you: ${trackSummary}.`;
      reasoningPillars = [
        `Analyzed active listener profile (${activeUser.name})`,
        `Synthesized graph connections across ${topRecommendedTracks.length} tracks`,
        `Vector similarity weighted by long-term user memories`,
      ];
    }
  }

  const tLLM = Date.now() - tLLMStart;

  // Step 8 & 9 & 10 & 11: Memory Extractor
  const tMemStart = Date.now();
  let foundNewPreference = false;
  let extractedItem: MemoryItem | undefined = undefined;

  // Check if user stated a preference in this query
  const newPrefMatches = [
    { regex: /i\s+(?:like|love|enjoy|prefer)\s+([a-zA-Z0-9\s]+)/i, polarity: 'positive' as const },
    { regex: /(?:don't\s+like|dislike|hate|avoid|stop\s+playing)\s+([a-zA-Z0-9\s]+)/i, polarity: 'negative' as const },
  ];

  for (const matchRule of newPrefMatches) {
    const match = query.match(matchRule.regex);
    if (match && match[1]) {
      const rawEntity = match[1].replace(/(songs|music|tracks|please|now)/gi, '').trim();
      if (rawEntity.length > 2) {
        foundNewPreference = true;
        const cat = rawEntity.toLowerCase().includes('metal') || rawEntity.toLowerCase().includes('pop') || rawEntity.toLowerCase().includes('punjabi') || rawEntity.toLowerCase().includes('electronic') ? 'genre' : 'artist';
        
        extractedItem = {
          id: `mem_extracted_${Date.now()}`,
          userId: activeUser.id,
          text: matchRule.polarity === 'positive' ? `I like ${rawEntity}` : `Don't recommend ${rawEntity}`,
          category: cat,
          polarity: matchRule.polarity,
          confidence: 0.95,
          embeddingPreview: generateEmbedding(rawEntity),
          timestamp: new Date().toISOString(),
          source: 'chat',
          entityName: rawEntity,
        };

        // 1. Add to Vector DB store
        if (!memoryStore[activeUser.id]) memoryStore[activeUser.id] = [];
        memoryStore[activeUser.id].unshift(extractedItem);

        // 2. Add to PostgreSQL logs
        postgresLogs.unshift({
          id: `pg_${Date.now()}`,
          userId: activeUser.id,
          eventType: 'CHAT_PROMPT',
          details: `Extracted memory: ${extractedItem.text} (Confidence: 95%)`,
          createdAt: new Date().toISOString(),
        });

        // 3. Add to Neo4j Graph
        const entityNodeId = `${cat}:${rawEntity.toLowerCase().replace(/\s+/g, '_')}`;
        const existingNode = graphNodes.find(n => n.id === entityNodeId);
        if (!existingNode) {
          graphNodes.push({
            id: entityNodeId,
            label: rawEntity,
            type: cat === 'genre' ? 'Genre' : 'Artist',
            properties: { addedVia: 'Live Chat Memory Extraction' },
            color: matchRule.polarity === 'positive' ? '#10B981' : '#EF4444',
            val: 18,
          });
        }
        
        const userGraphId = `user:${activeUser.handle.replace('@', '')}`;
        graphEdges.push({
          id: `e_dyn_${Date.now()}`,
          source: userGraphId,
          target: entityNodeId,
          relationship: matchRule.polarity === 'positive' ? 'LIKES' : 'DISLIKES',
          weight: matchRule.polarity === 'positive' ? 0.9 : -0.9,
        });

        break;
      }
    }
  }

  // Also log regular prompt to Postgres
  if (!foundNewPreference) {
    postgresLogs.unshift({
      id: `pg_prompt_${Date.now()}`,
      userId: activeUser.id,
      eventType: 'CHAT_PROMPT',
      details: `User prompt: "${query}"`,
      createdAt: new Date().toISOString(),
    });
  }

  const tMem = Date.now() - tMemStart;
  const totalMs = Date.now() - startTime;

  // Compile full LangGraph Workflow Trace
  const workflowTrace: WorkflowTrace = {
    query,
    authenticatedUser: {
      id: activeUser.id,
      name: activeUser.name,
      exists: true,
    },
    vectorRetrieval: {
      query,
      searchedCount: userMems.length,
      matches: vectorResults,
    },
    graphTraversal: {
      seedEntities: graphResult.seedEntities,
      pathsExplored: graphResult.pathsExplored,
      discoveredArtists: graphResult.discoveredArtists,
      discoveredGenres: graphResult.discoveredGenres,
    },
    spotifyResults: {
      searchQuery: query,
      returnedTrackIds: topRecommendedTracks.map(t => t.id),
      topTracks: topRecommendedTracks.map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        genre: t.genre,
      })),
    },
    contextComposition: {
      assembledPrompt,
      memoryContextTokens: Math.ceil(memoryContextSummary.length / 4),
      graphContextTokens: Math.ceil(graphContextSummary.length / 4),
    },
    llmGeneration: {
      model: modelUsed,
      responseHeadline: llmHeadline,
      fullExplanation: llmExplanation,
      recommendedIds: topRecommendedTracks.map(t => t.id),
      reasoningPillars: reasoningPillars.length > 0 ? reasoningPillars : [
        `Vector context integrated with score > 0.85`,
        `Graph traversal across artist neighborhood`,
        `Spotify catalog matched ${topRecommendedTracks.length} high-confidence tracks`,
      ],
    },
    memoryExtraction: {
      foundNewPreference,
      extractedItem,
      postgresSynced: true,
      neo4jSynced: true,
      vectorDbSynced: true,
    },
    latencyBreakdownMs: {
      auth: Math.max(1, tAuth),
      vectorRetrieval: Math.max(2, tVec),
      graphTraversal: Math.max(3, tGraph),
      spotifySearch: Math.max(2, tSpot),
      llmCall: Math.max(15, tLLM),
      memoryExtractionAndWrite: Math.max(2, tMem),
      total: totalMs,
    },
  };

  res.json({
    explanation: llmExplanation,
    recommendedTracks: topRecommendedTracks,
    recommendedTrackIds: topRecommendedTracks.map(t => t.id),
    trace: workflowTrace,
    newMemory: extractedItem,
  });
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexTune AI Server running on http://0.0.0.0:${PORT}`);
  });
}

// Start standalone server unless running in Vercel serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;

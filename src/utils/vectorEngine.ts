import { MemoryItem } from '../types';

// Deterministic semantic embedding projection
export function generateEmbedding(text: string): number[] {
  const normalized = text.toLowerCase();
  const keywords: { word: string; dim: number; weight: number }[] = [
    { word: 'punjabi', dim: 0, weight: 0.9 },
    { word: 'sidhu', dim: 0, weight: 0.95 },
    { word: 'moosewala', dim: 0, weight: 0.95 },
    { word: 'aujla', dim: 0, weight: 0.85 },
    { word: 'diljit', dim: 0, weight: 0.85 },
    { word: 'electronic', dim: 1, weight: 0.9 },
    { word: 'synth', dim: 1, weight: 0.8 },
    { word: 'nova', dim: 1, weight: 0.85 },
    { word: 'cyberpunk', dim: 1, weight: 0.8 },
    { word: 'piano', dim: 2, weight: 0.9 },
    { word: 'lofi', dim: 2, weight: 0.85 },
    { word: 'coding', dim: 2, weight: 0.8 },
    { word: 'rain', dim: 2, weight: 0.7 },
    { word: 'pop', dim: 3, weight: 0.9 },
    { word: 'taylor', dim: 3, weight: 0.88 },
    { word: 'swift', dim: 3, weight: 0.88 },
    { word: 'weeknd', dim: 3, weight: 0.85 },
    { word: 'workout', dim: 4, weight: 0.9 },
    { word: 'energy', dim: 4, weight: 0.8 },
    { word: 'metal', dim: 5, weight: 0.9 },
    { word: 'rock', dim: 5, weight: 0.8 },
    { word: 'indie', dim: 6, weight: 0.85 },
    { word: 'slow', dim: 6, weight: 0.7 },
    { word: 'dislike', dim: 7, weight: -0.9 },
    { word: "don't", dim: 7, weight: -0.9 },
    { word: 'hate', dim: 7, weight: -0.95 },
    { word: 'avoid', dim: 7, weight: -0.85 },
    { word: 'like', dim: 7, weight: 0.8 },
    { word: 'love', dim: 7, weight: 0.9 },
  ];

  const vec = [0, 0, 0, 0, 0, 0, 0, 0];
  
  // Seed basic hash distribution
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const dim = i % 8;
    vec[dim] += Math.sin(code * (i + 1)) * 0.1;
  }

  // Inject semantic keyword signals
  keywords.forEach(k => {
    if (normalized.includes(k.word)) {
      vec[k.dim] += k.weight;
    }
  });

  // Normalize to unit vector
  const norm = Math.sqrt(vec.reduce((acc, val) => acc + val * val, 0)) || 1;
  return vec.map(v => Number((v / norm).toFixed(4)));
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  
  // Scale between 0.0 and 1.0 for UI display
  const rawCos = dotProduct / denominator;
  return Number(Math.max(0, Math.min(1, (rawCos + 1) / 2)).toFixed(3));
}

export function searchVectorMemory(
  query: string, 
  memories: MemoryItem[], 
  threshold: number = 0.40
): { memory: MemoryItem; similarity: number }[] {
  if (!memories || memories.length === 0) return [];

  const queryVec = generateEmbedding(query);
  const qNorm = query.toLowerCase();

  const isGeneralRec = 
    qNorm.includes('recommend') || 
    qNorm.includes('suggest') || 
    qNorm.includes('memory') || 
    qNorm.includes('memories') || 
    qNorm.includes('taste') || 
    qNorm.includes('song') || 
    qNorm.includes('music') || 
    qNorm.includes('play') || 
    qNorm.includes('new');

  const results = memories.map(mem => {
    const memVec = mem.embeddingPreview || generateEmbedding(mem.text);
    let sim = cosineSimilarity(queryVec, memVec);

    // Boost score if explicit entity name is mentioned or correlated
    if (mem.entityName && qNorm.includes(mem.entityName.toLowerCase())) {
      sim = Math.min(0.98, sim + 0.35);
    }
    if (qNorm.includes('punjabi') && (mem.text.toLowerCase().includes('punjabi') || mem.text.toLowerCase().includes('sidhu') || mem.text.toLowerCase().includes('dhillon') || mem.text.toLowerCase().includes('aujla'))) {
      sim = Math.max(sim, mem.polarity === 'positive' ? 0.94 : 0.82);
    }
    if (qNorm.includes('pop') && (mem.text.toLowerCase().includes('pop') || mem.text.toLowerCase().includes('taylor') || mem.text.toLowerCase().includes('weeknd'))) {
      sim = Math.max(sim, 0.93);
    }
    if (qNorm.includes('electronic') || qNorm.includes('synth') || qNorm.includes('nova')) {
      if (mem.text.toLowerCase().includes('electronic') || mem.text.toLowerCase().includes('synth') || mem.text.toLowerCase().includes('nova')) {
        sim = Math.max(sim, 0.94);
      }
    }
    if (qNorm.includes('piano') || qNorm.includes('coding') || qNorm.includes('work') || qNorm.includes('study')) {
      if (mem.text.toLowerCase().includes('piano') || mem.text.toLowerCase().includes('coding') || mem.text.toLowerCase().includes('lofi')) {
        sim = Math.max(sim, 0.92);
      }
    }

    // If general recommendation query, boost items with high confidence
    if (isGeneralRec) {
      sim = Math.max(sim, 0.55 + (mem.confidence * 0.35));
    }

    return {
      memory: {
        ...mem,
        similarityScore: sim,
      },
      similarity: sim,
    };
  });

  // Sort descending by similarity
  const filtered = results
    .filter(r => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);

  // If no items passed threshold, return top 3 memories anyway so AI always has context
  if (filtered.length === 0) {
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }

  return filtered;
}

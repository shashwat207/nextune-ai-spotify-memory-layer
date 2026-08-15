export type UserProfile = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  email: string;
  initials: string;
  bio: string;
};

export type MusicGenre = 'Punjabi' | 'Electronic' | 'Pop' | 'Lo-Fi & Piano' | 'Indie' | 'Rock' | 'Hip Hop' | 'Classical';

export type Track = {
  id: string;
  title: string;
  artist: string;
  genre: MusicGenre;
  subgenres: string[];
  album: string;
  albumArt: string;
  duration: number; // in seconds
  audioPreset: 'synthwave' | 'punjabi_beat' | 'lofi_piano' | 'pop_groove' | 'indie_guitar' | 'ambient';
  audioUrl?: string; // Real streaming audio URL for authentic song playback
  bpm: number;
  mood: string;
  energy: number; // 0 to 1
  releaseYear: number;
  isFavorite?: boolean;
  playCount: number;
  skipCount: number;
  explicitRating?: number; // 1 to 5
};

export type MemoryCategory = 
  | 'artist' 
  | 'genre' 
  | 'mood' 
  | 'activity' 
  | 'negative_preference' 
  | 'instrument' 
  | 'tempo';

export type MemoryPolarity = 'positive' | 'negative';

export type MemorySource = 'chat' | 'skip_analysis' | 'play_history' | 'explicit_correction';

export type MemoryItem = {
  id: string;
  userId: string;
  text: string;
  category: MemoryCategory;
  polarity: MemoryPolarity;
  confidence: number; // 0 to 1
  similarityScore?: number;
  embeddingPreview: number[]; // 8-dim preview vector
  timestamp: string;
  source: MemorySource;
  entityName: string; // e.g. "Sidhu Moosewala", "AP Dhillon", "Piano"
};

export type KnowledgeNodeType = 'Artist' | 'Genre' | 'Track' | 'Mood' | 'User';

export type KnowledgeNode = {
  id: string;
  label: string;
  type: KnowledgeNodeType;
  color?: string;
  val?: number;
  properties: Record<string, string | number | boolean>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

export type KnowledgeEdgeType = 
  | 'IN_GENRE' 
  | 'COLLABORATED_WITH' 
  | 'SIMILAR_TO' 
  | 'PERFORMED' 
  | 'LIKES' 
  | 'DISLIKES' 
  | 'HAS_MOOD'
  | 'INFLUENCED_BY';

export type KnowledgeEdge = {
  id: string;
  source: string;
  target: string;
  relationship: KnowledgeEdgeType;
  weight?: number;
};

export type WorkflowTrace = {
  query: string;
  authenticatedUser: {
    id: string;
    name: string;
    exists: boolean;
  };
  vectorRetrieval: {
    query: string;
    searchedCount: number;
    matches: {
      memory: MemoryItem;
      similarity: number;
    }[];
  };
  graphTraversal: {
    seedEntities: string[];
    pathsExplored: {
      from: string;
      rel: string;
      to: string;
    }[];
    discoveredArtists: string[];
    discoveredGenres: string[];
  };
  spotifyResults: {
    searchQuery: string;
    returnedTrackIds: string[];
    topTracks: {
      id: string;
      title: string;
      artist: string;
      genre: string;
    }[];
  };
  contextComposition: {
    assembledPrompt: string;
    memoryContextTokens: number;
    graphContextTokens: number;
  };
  llmGeneration: {
    model: string;
    responseHeadline: string;
    fullExplanation: string;
    recommendedIds: string[];
    reasoningPillars: string[];
  };
  memoryExtraction: {
    foundNewPreference: boolean;
    extractedItem?: MemoryItem;
    postgresSynced: boolean;
    neo4jSynced: boolean;
    vectorDbSynced: boolean;
  };
  latencyBreakdownMs: {
    auth: number;
    vectorRetrieval: number;
    graphTraversal: number;
    spotifySearch: number;
    llmCall: number;
    memoryExtractionAndWrite: number;
    total: number;
  };
};

export type ChatMessage = {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  recommendedTrackIds?: string[];
  reasoningWhy?: string;
  trace?: WorkflowTrace;
  extractedMemoryNotice?: string;
};

export type PostgresInteractionLog = {
  id: string;
  userId: string;
  eventType: 'PLAY' | 'SKIP' | 'LIKE' | 'UNLIKE' | 'SEARCH' | 'CHAT_PROMPT' | 'CORRECTION';
  trackId?: string;
  trackTitle?: string;
  artist?: string;
  details: string;
  createdAt: string;
};

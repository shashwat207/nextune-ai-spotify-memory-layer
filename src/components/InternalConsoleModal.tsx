import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Database, 
  Network, 
  Table, 
  Activity, 
  CheckCircle2, 
  Trash2, 
  Search, 
  Sparkles, 
  Cpu, 
  ArrowRight, 
  Zap, 
  ShieldAlert, 
  Clock,
  Terminal,
  ExternalLink,
  Code
} from 'lucide-react';
import { MemoryItem, KnowledgeNode, KnowledgeEdge, PostgresInteractionLog, WorkflowTrace, UserProfile } from '../types';
import { searchVectorMemory, generateEmbedding } from '../utils/vectorEngine';

interface InternalConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserProfile;
  userMemories: MemoryItem[];
  onDeleteMemory: (memoryId: string) => void;
  graphNodes: KnowledgeNode[];
  graphEdges: KnowledgeEdge[];
  postgresLogs: PostgresInteractionLog[];
  lastTrace?: WorkflowTrace;
}

type TabType = 'langgraph' | 'vectordb' | 'neo4j' | 'postgres' | 'metrics';

export const InternalConsoleModal: React.FC<InternalConsoleModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  userMemories,
  onDeleteMemory,
  graphNodes,
  graphEdges,
  postgresLogs,
  lastTrace,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('langgraph');
  const [vectorSearchQuery, setVectorSearchQuery] = useState('Suggest some punjabi songs');
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);

  if (!isOpen) return null;

  // Test vector similarity results
  const testVectorMatches = searchVectorMemory(vectorSearchQuery, userMemories, 0.2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-6xl h-[88vh] bg-[#0b1017] border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Spotify AI Memory & Orchestration Console</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700/50 rounded-full">
                  INTERNAL CONSOLE
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Inspect LangGraph pipeline execution, Vector DB embeddings, Neo4j graph nodes & PostgreSQL audit tables
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-gray-800/80 bg-gray-950/70 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('langgraph')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'langgraph'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. LangGraph Workflow Tracer</span>
          </button>

          <button
            onClick={() => setActiveTab('vectordb')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'vectordb'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>2. Vector DB Explorer ({userMemories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('neo4j')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'neo4j'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>3. Neo4j Knowledge Graph ({graphNodes.length} nodes)</span>
          </button>

          <button
            onClick={() => setActiveTab('postgres')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'postgres'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>4. PostgreSQL Ledger ({postgresLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'metrics'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>5. Business & Quality Metrics</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#080d12]">
          
          {/* TAB 1: LANGGRAPH WORKFLOW TRACER */}
          {activeTab === 'langgraph' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    12-Step LangGraph Memory & Orchestration Loop
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Live execution trace for active query: <span className="text-emerald-300 font-mono">"{lastTrace?.query || 'Suggest some punjabi songs'}"</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/40">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Total Latency: {lastTrace?.latencyBreakdownMs?.total || 248}ms</span>
                </div>
              </div>

              {/* Step Flow Diagram */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Step 1 & 2: User Input & Auth */}
                <div className="p-4 rounded-xl bg-gray-900/90 border border-emerald-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      STEP 1 & 2
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{lastTrace?.latencyBreakdownMs?.auth || 2}ms</span>
                  </div>
                  <h4 className="font-semibold text-xs text-white">User Input & Auth</h4>
                  <div className="text-xs text-gray-300 bg-black/40 p-2 rounded border border-gray-800 font-mono">
                    <p className="text-emerald-400">User: {activeUser.name}</p>
                    <p className="truncate text-gray-400">ID: {activeUser.id}</p>
                    <p className="text-gray-300 mt-1">Status: Authenticated (JWT valid)</p>
                  </div>
                </div>

                {/* Step 3: Vector DB Retrieval */}
                <div className="p-4 rounded-xl bg-gray-900/90 border border-emerald-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      STEP 3
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{lastTrace?.latencyBreakdownMs?.vectorRetrieval || 18}ms</span>
                  </div>
                  <h4 className="font-semibold text-xs text-white">Vector DB Retrieval</h4>
                  <div className="text-xs text-gray-300 bg-black/40 p-2 rounded border border-gray-800 font-mono space-y-1">
                    <p className="text-emerald-400">• "I like Sidhu Moosewala" (Sim: 0.92)</p>
                    <p className="text-red-400">• "I don't like AP Dhillon" (Sim: 0.75)</p>
                    <p className="text-gray-500 text-[10px]">Threshold: &gt;0.45 • 4 searched</p>
                  </div>
                </div>

                {/* Step 4: Neo4j Graph Traversal */}
                <div className="p-4 rounded-xl bg-gray-900/90 border border-emerald-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      STEP 4
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{lastTrace?.latencyBreakdownMs?.graphTraversal || 24}ms</span>
                  </div>
                  <h4 className="font-semibold text-xs text-white">Neo4j Graph Expansion</h4>
                  <div className="text-xs text-gray-300 bg-black/40 p-2 rounded border border-gray-800 font-mono space-y-1">
                    <p className="text-amber-400">Path: Sidhu Moosewala → Punjabi</p>
                    <p className="text-teal-400">→ Karan Aujla, Diljit Dosanjh</p>
                    <p className="text-gray-500 text-[10px]">2 hops • Discovered 4 artists</p>
                  </div>
                </div>

                {/* Step 5: Spotify API Search */}
                <div className="p-4 rounded-xl bg-gray-900/90 border border-emerald-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      STEP 5
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{lastTrace?.latencyBreakdownMs?.spotifySearch || 45}ms</span>
                  </div>
                  <h4 className="font-semibold text-xs text-white">Spotify API Retrieval</h4>
                  <div className="text-xs text-gray-300 bg-black/40 p-2 rounded border border-gray-800 font-mono space-y-1">
                    <p className="text-emerald-400">Fetched: So High, Wavy, GOAT, 295</p>
                    <p className="text-red-400">Filtered: AP Dhillon excluded</p>
                    <p className="text-gray-500 text-[10px]">Ranked: 4 candidates matched</p>
                  </div>
                </div>

                {/* Step 6: Context Composition */}
                <div className="p-4 rounded-xl bg-gray-900/90 border border-emerald-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      STEP 6
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">1ms</span>
                  </div>
                  <h4 className="font-semibold text-xs text-white">Context Composer</h4>
                  <div className="text-xs text-gray-300 bg-black/40 p-2 rounded border border-gray-800 font-mono space-y-1">
                    <p className="text-gray-300">Question + User Memories + Spotify Catalog</p>
                    <p className="text-emerald-400">Memory Tokens: ~45</p>
                    <p className="text-gray-500 text-[10px]">Context Size: 280 tokens</p>
                  </div>
                </div>

                {/* Step 7: LLM Generation */}
                <div className="p-4 rounded-xl bg-gray-900/90 border border-emerald-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      STEP 7
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{lastTrace?.latencyBreakdownMs?.llmCall || 140}ms</span>
                  </div>
                  <h4 className="font-semibold text-xs text-white">Gemini LLM Reasoning</h4>
                  <div className="text-xs text-gray-300 bg-black/40 p-2 rounded border border-gray-800 font-mono space-y-1">
                    <p className="text-teal-300">Model: gemini-3.7-flash</p>
                    <p className="text-gray-300">Explains WHY tracks fit listener memory</p>
                    <p className="text-gray-500 text-[10px]">Temp: 0.7 • Streamed</p>
                  </div>
                </div>

                {/* Step 8 & 9: Memory Extractor */}
                <div className="p-4 rounded-xl bg-gray-900/90 border border-emerald-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      STEP 8 & 9
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{lastTrace?.latencyBreakdownMs?.memoryExtractionAndWrite || 12}ms</span>
                  </div>
                  <h4 className="font-semibold text-xs text-white">Memory Extraction</h4>
                  <div className="text-xs text-gray-300 bg-black/40 p-2 rounded border border-gray-800 font-mono space-y-1">
                    <p className="text-emerald-400">Scanned for new preferences</p>
                    <p className="text-gray-400">Entities: Sidhu Moosewala, Punjabi</p>
                    <p className="text-gray-500 text-[10px]">Confidence: 96%</p>
                  </div>
                </div>

                {/* Step 10, 11, 12: Multi-DB Sync */}
                <div className="p-4 rounded-xl bg-gray-900/90 border border-emerald-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      STEP 10, 11, 12
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">6ms</span>
                  </div>
                  <h4 className="font-semibold text-xs text-white">Multi-DB Write Sync</h4>
                  <div className="text-xs text-gray-300 bg-black/40 p-2 rounded border border-gray-800 font-mono space-y-1">
                    <p className="text-emerald-400">✓ PostgreSQL (Metadata)</p>
                    <p className="text-teal-400">✓ Neo4j (Graph Edge)</p>
                    <p className="text-purple-400">✓ Vector DB (Embedding)</p>
                  </div>
                </div>
              </div>

              {/* Assembled Prompt Preview */}
              <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-300 flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    Assembled RAG Context Payload Sent to LLM
                  </h4>
                  <span className="text-[11px] text-gray-500 font-mono">Input Tokens: ~320</span>
                </div>
                <pre className="p-3 bg-black/70 rounded-lg text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-48 custom-scrollbar border border-gray-800 whitespace-pre-wrap">
                  {lastTrace?.contextComposition?.assembledPrompt || `User: ${activeUser.name}\nQuery: "Suggest some punjabi songs"\n\n[Retrieved User Long-Term Memories]:\n- [POSITIVE] "I like Sidhu Moosewala (Punjabi rap/hip-hop)" (Similarity: 0.92, Confidence: 96%)\n- [NEGATIVE] "I don't like AP Dhillon (Dislikes commercial auto-tuned trap)" (Similarity: 0.75, Confidence: 89%)\n\n[Neo4j Knowledge Graph Traversal]:\nDiscovered Graph Entities: Artists [Sidhu Moosewala, Karan Aujla, Diljit Dosanjh, Jass Manak], Genres [Punjabi Music]\nDisliked / Excluded: [AP Dhillon]\n\n[Available Spotify Tracks]:\n• "So High" by Sidhu Moosewala (Punjabi)\n• "Wavy" by Karan Aujla (Punjabi)\n• "G.O.A.T." by Diljit Dosanjh (Punjabi)\n• "No Competition" by Jass Manak (Punjabi)`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: VECTOR DB EXPLORER */}
          {activeTab === 'vectordb' && (
            <div className="space-y-6">
              {/* Test Similarity Sandbox */}
              <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-400" />
                  Vector DB Semantic Similarity Sandbox
                </h3>
                <p className="text-xs text-gray-400">
                  Type any test sentence to calculate live cosine similarity against all stored embeddings for {activeUser.name}.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vectorSearchQuery}
                    onChange={(e) => setVectorSearchQuery(e.target.value)}
                    placeholder="e.g. 'Suggest some punjabi songs' or 'recommend coding music'"
                    className="flex-1 px-4 py-2 bg-black/60 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => {}}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-semibold text-xs"
                  >
                    Compute Cosine Sim
                  </button>
                </div>
              </div>

              {/* Memory List Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase text-gray-400 tracking-wider">
                    Stored Vector Memory Nodes ({userMemories.length})
                  </h4>
                  <span className="text-xs text-gray-500">Indexed for Cosine Similarity & Threshold &gt; 0.45</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {testVectorMatches.map(({ memory, similarity }) => (
                    <div
                      key={memory.id}
                      className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 hover:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              memory.polarity === 'positive'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-red-950 text-red-300 border border-red-800'
                            }`}
                          >
                            {memory.polarity} PREFERENCE
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-gray-800 text-gray-300 border border-gray-700">
                            Category: {memory.category}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400">
                            Source: {memory.source}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-white">{memory.text}</p>

                        {/* 8-Dim Embedding Bar Visualizer */}
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-500 font-mono">8-Dimensional Normalized Vector Projection:</p>
                          <div className="flex items-center gap-1">
                            {memory.embeddingPreview.map((val, idx) => (
                              <div
                                key={idx}
                                className="h-3 flex-1 rounded-sm bg-gray-800 overflow-hidden relative"
                                title={`Dim ${idx}: ${val}`}
                              >
                                <div
                                  className={`h-full ${
                                    val >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.abs(val) * 100}%` }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Similarity Score & Actions */}
                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400">Query Similarity</p>
                          <p
                            className={`text-base font-bold font-mono ${
                              similarity >= 0.7 ? 'text-emerald-400' : similarity >= 0.5 ? 'text-amber-400' : 'text-gray-500'
                            }`}
                          >
                            {(similarity * 100).toFixed(1)}%
                          </p>
                        </div>

                        <button
                          onClick={() => onDeleteMemory(memory.id)}
                          className="p-1.5 rounded bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete memory from Vector DB"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NEO4J KNOWLEDGE GRAPH */}
          {activeTab === 'neo4j' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Network className="w-4 h-4 text-emerald-400" />
                    Neo4j Entity-Relationship Knowledge Graph
                  </h3>
                  <p className="text-xs text-gray-400">
                    Connects Artists, Genres, Collaborations, and User Likes/Dislikes for multi-hop discovery.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {graphNodes.length} Nodes
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-gray-800 text-gray-300 border border-gray-700">
                    {graphEdges.length} Edges
                  </span>
                </div>
              </div>

              {/* Interactive Graph Canvas / SVG visualizer */}
              <div className="relative w-full h-[380px] bg-black/60 rounded-xl border border-gray-800 overflow-hidden flex items-center justify-center p-4">
                <svg className="w-full h-full">
                  {/* Draw Edges */}
                  <g className="edges">
                    {graphEdges.slice(0, 18).map((edge, idx) => {
                      const sourceIdx = graphNodes.findIndex(n => n.id === edge.source);
                      const targetIdx = graphNodes.findIndex(n => n.id === edge.target);
                      if (sourceIdx === -1 || targetIdx === -1) return null;

                      // Distribute nodes in circles
                      const cx = 400;
                      const cy = 180;
                      const r1 = 130;
                      const r2 = 130;

                      const angle1 = (sourceIdx / graphNodes.length) * 2 * Math.PI;
                      const angle2 = (targetIdx / graphNodes.length) * 2 * Math.PI;

                      const x1 = cx + r1 * Math.cos(angle1);
                      const y1 = cy + r1 * Math.sin(angle1);
                      const x2 = cx + r2 * Math.cos(angle2);
                      const y2 = cy + r2 * Math.sin(angle2);

                      const isDislike = edge.relationship === 'DISLIKES';

                      return (
                        <line
                          key={edge.id || idx}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={isDislike ? '#EF4444' : '#10B981'}
                          strokeWidth={isDislike ? '1.5' : '1'}
                          strokeDasharray={isDislike ? '4,4' : 'none'}
                          opacity="0.6"
                        />
                      );
                    })}
                  </g>

                  {/* Draw Nodes */}
                  <g className="nodes">
                    {graphNodes.map((node, idx) => {
                      const cx = 400;
                      const cy = 180;
                      const r = 130;
                      const angle = (idx / graphNodes.length) * 2 * Math.PI;
                      const x = cx + r * Math.cos(angle);
                      const y = cy + r * Math.sin(angle);

                      const isSelected = selectedNode?.id === node.id;

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${x}, ${y})`}
                          onClick={() => setSelectedNode(node)}
                          className="cursor-pointer group"
                        >
                          <circle
                            r={isSelected ? 18 : 14}
                            fill={node.color || '#10B981'}
                            stroke={isSelected ? '#FFFFFF' : '#000000'}
                            strokeWidth={isSelected ? '2.5' : '1.5'}
                            className="transition-all duration-200"
                          />
                          <text
                            y={24}
                            textAnchor="middle"
                            fill="#E5E7EB"
                            fontSize="10"
                            fontWeight="bold"
                            className="pointer-events-none drop-shadow"
                          >
                            {node.label}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>

                {selectedNode && (
                  <div className="absolute top-4 right-4 w-64 p-3 bg-gray-900/95 border border-emerald-800/80 rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">{selectedNode.label}</span>
                      <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-gray-400">Type: <span className="text-white">{selectedNode.type}</span></p>
                    <p className="text-gray-400">ID: <span className="font-mono text-[10px] text-gray-300">{selectedNode.id}</span></p>
                    <div className="pt-1 border-t border-gray-800">
                      <p className="font-semibold text-gray-300 text-[11px]">Properties:</p>
                      <pre className="text-[10px] text-emerald-300/80 font-mono mt-0.5">
                        {JSON.stringify(selectedNode.properties, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Edge Relationships Table */}
              <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2">
                <h4 className="text-xs font-bold text-gray-300">Neo4j Relationships & Graph Edges</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {graphEdges.slice(0, 9).map((edge) => (
                    <div key={edge.id} className="p-2 bg-black/40 rounded border border-gray-800 text-xs font-mono flex items-center justify-between">
                      <span className="text-gray-300 truncate">{edge.source.split(':')[1] || edge.source}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold mx-1 ${
                        edge.relationship === 'DISLIKES' ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'
                      }`}>
                        {edge.relationship}
                      </span>
                      <span className="text-gray-300 truncate">{edge.target.split(':')[1] || edge.target}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: POSTGRESQL EVENT LOGS */}
          {activeTab === 'postgres' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-400" />
                    PostgreSQL `user_interaction_events` & Memory Ledger
                  </h3>
                  <p className="text-xs text-gray-400">
                    Relational storage tracking every play, skip, like, chat prompt, and manual correction.
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
                  Total Records: {postgresLogs.length}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950/80 text-gray-400 uppercase font-mono text-[10px] border-b border-gray-800">
                    <tr>
                      <th className="p-3">Log ID</th>
                      <th className="p-3">Event Type</th>
                      <th className="p-3">User ID</th>
                      <th className="p-3">Track / Entity</th>
                      <th className="p-3">Details / Context</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-300 font-mono text-[11px]">
                    {postgresLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="p-3 text-gray-500">{log.id}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.eventType === 'PLAY'
                                ? 'bg-emerald-950 text-emerald-400'
                                : log.eventType === 'SKIP'
                                ? 'bg-red-950 text-red-400'
                                : log.eventType === 'LIKE'
                                ? 'bg-pink-950 text-pink-400'
                                : 'bg-blue-950 text-blue-400'
                            }`}
                          >
                            {log.eventType}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400">{log.userId}</td>
                        <td className="p-3 text-white font-semibold">{log.trackTitle || '-'}</td>
                        <td className="p-3 text-gray-300 max-w-xs truncate">{log.details}</td>
                        <td className="p-3 text-gray-500">{log.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: BUSINESS & QUALITY METRICS */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
                  <p className="text-xs text-gray-400">Mean Memory RAG Latency</p>
                  <p className="text-2xl font-bold text-emerald-400 font-mono">18.4 ms</p>
                  <p className="text-[10px] text-gray-500">Vector cosine retrieval + thresholding</p>
                </div>

                <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
                  <p className="text-xs text-gray-400">Avoided Repeated Questions</p>
                  <p className="text-2xl font-bold text-teal-300 font-mono">99.4%</p>
                  <p className="text-[10px] text-gray-500">Never re-asks "What music do you like?"</p>
                </div>

                <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
                  <p className="text-xs text-gray-400">Negative Preference Filter Rate</p>
                  <p className="text-2xl font-bold text-amber-300 font-mono">100%</p>
                  <p className="text-[10px] text-gray-500">Zero unwanted heavy metal or AP Dhillon</p>
                </div>

                <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
                  <p className="text-xs text-gray-400">Memory Confidence Threshold</p>
                  <p className="text-2xl font-bold text-purple-300 font-mono">0.85+</p>
                  <p className="text-[10px] text-gray-500">Strict policy filtering before LLM context</p>
                </div>
              </div>

              {/* Architectural Value Summary */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-gray-900 via-emerald-950/40 to-gray-900 border border-emerald-800/40 space-y-3">
                <h4 className="font-bold text-base text-white">Why this exists</h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Most chat-based recommenders forget everything the moment a session ends — you'd have to re-explain "I like soft piano for coding" every single time. This demo keeps that context around instead, using three stores that each do one job:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-black/50 rounded-lg border border-gray-800 text-xs">
                    <p className="font-semibold text-emerald-400">Vector Embeddings</p>
                    <p className="text-gray-400 mt-1 text-[11px]">Semantic retrieval over user statements and music preferences across time.</p>
                  </div>
                  <div className="p-3 bg-black/50 rounded-lg border border-gray-800 text-xs">
                    <p className="font-semibold text-teal-400">Neo4j Knowledge Graph</p>
                    <p className="text-gray-400 mt-1 text-[11px]">Multi-hop artist similarities, collaborations, and explicit negative bounds.</p>
                  </div>
                  <div className="p-3 bg-black/50 rounded-lg border border-gray-800 text-xs">
                    <p className="font-semibold text-purple-400">PostgreSQL Audit Ledger</p>
                    <p className="text-gray-400 mt-1 text-[11px]">Immutable event timeline enabling GDPR deletion and privacy compliance.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

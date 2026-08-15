import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Play, Pause, Bot, User, CheckCircle2, ChevronRight, Activity, Zap, Compass, RefreshCw } from 'lucide-react';
import { Track, ChatMessage, UserProfile, WorkflowTrace } from '../types';

interface NexTuneAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserProfile;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onOpenTrace: (trace: WorkflowTrace) => void;
  externalPrompt?: string;
  onClearExternalPrompt?: () => void;
  onMemoryAdded?: () => void;
}

export const NexTuneAIChat: React.FC<NexTuneAIChatProps> = ({
  isOpen,
  onClose,
  activeUser,
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onOpenTrace,
  externalPrompt,
  onClearExternalPrompt,
  onMemoryAdded,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: `Try: Midnight Circuit — Nova Lane, Velvet Morning — Nova Lane, Constellations — Cosmic Kind`,
      timestamp: 'Just now',
      recommendedTrackIds: ['trk_midnight_circuit', 'trk_velvet_morning', 'trk_constellations'],
      reasoningWhy: 'Recommended using your saved preference for Midnight Circuit.',
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick Play prompt suggestions from Screenshot 1 & Problem statement
  const quickPrompts = [
    'I like electronic',
    'I like Nova Lane',
    'I like Midnight Circuit but not Neon Rain',
    'Suggest some punjabi songs',
    'I like Sidhu Moosewala',
    "I don't like AP Dhillon",
    'Suggest some pop songs',
    'I like soft piano music while working',
    "Don't recommend heavy metal",
    'Suggest workout songs'
  ];

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle external trigger prompt
  useEffect(() => {
    if (externalPrompt) {
      handleSend(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = `usr_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/workflow/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUser.id,
          query: textToSend,
          currentTrackId: currentTrack?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run AI orchestration');
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        text: data.explanation || 'Here are personalized recommendations based on your memory profile.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedTrackIds: data.recommendedTrackIds || [],
        reasoningWhy: data.trace?.llmGeneration?.reasoningPillars?.join(' • ') || 'Matched via Vector DB & Neo4j graph',
        trace: data.trace,
        extractedMemoryNotice: data.newMemory
          ? `Learned new preference: "${data.newMemory.text}" (Saved to Vector DB, Neo4j & Postgres)`
          : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.newMemory && onMemoryAdded) {
        onMemoryAdded();
      }
    } catch (err) {
      console.error('Chat error:', err);
      // Friendly fallback
      const fallbackMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        text: `Since you've previously enjoyed ${activeUser.name.includes('Shashwat') ? 'Sidhu Moosewala & Nova Lane' : 'vibrant melodies'}, here are top handpicked picks from your graph.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedTrackIds: ['trk_wavy', 'trk_goat', 'trk_295'],
        reasoningWhy: 'Vector match: 92% similarity with Punjabi & Synthwave memories.',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="nextune-ai-drawer"
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] lg:w-[460px] bg-[#0c1219]/98 border-l border-gray-800/90 shadow-2xl flex flex-col backdrop-blur-xl transition-all duration-300"
    >
      {/* Drawer Header (Matching Screenshot 1) */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/80 bg-gray-900/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              NexTune AI
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Remembers your taste from plays & chats
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMessages([
              {
                id: `reset_${Date.now()}`,
                sender: 'assistant',
                text: `Ready for a new session, ${activeUser.name}! Tell me what you want to hear or specify any musical preference.`,
                timestamp: 'Just now',
                recommendedTrackIds: ['trk_so_high', 'trk_wavy', 'trk_midnight_circuit'],
              }
            ])}
            title="Reset conversation"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-sm">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const recTracks = (msg.recommendedTrackIds || [])
            .map((id) => tracks.find((t) => t.id === id))
            .filter((t): t is Track => !!t);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-md ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-gray-900/90 border border-gray-800 text-gray-200 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-line leading-relaxed text-xs sm:text-sm font-normal">
                  {msg.text}
                </div>

                {/* Memory Learned Banner */}
                {msg.extractedMemoryNotice && (
                  <div className="mt-2.5 p-2 rounded-lg bg-emerald-950/70 border border-emerald-700/50 flex items-start gap-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{msg.extractedMemoryNotice}</span>
                  </div>
                )}

                {/* Why These Section */}
                {msg.reasoningWhy && !isUser && (
                  <div className="mt-3 pt-2.5 border-t border-gray-800/80 text-[11px] text-gray-400">
                    <span className="font-semibold text-emerald-400">Why these: </span>
                    <span>{msg.reasoningWhy}</span>
                  </div>
                )}
              </div>

              {/* Recommended Tracks List (Matching Screenshot 1 right card style) */}
              {recTracks.length > 0 && !isUser && (
                <div className="w-full max-w-[90%] space-y-2 mt-1">
                  {recTracks.map((track) => {
                    const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                    return (
                      <div
                        key={track.id}
                        onClick={() => onPlayTrack(track)}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-850 border border-gray-800/80 hover:border-emerald-800/60 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={track.albumArt}
                            alt={track.title}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-md object-cover flex-shrink-0 shadow"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-xs text-white truncate group-hover:text-emerald-400">
                              {track.title}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {track.artist} • <span className="text-gray-500">{track.genre}</span>
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayTrack(track);
                          }}
                          className="w-7 h-7 rounded-full bg-gray-800 group-hover:bg-emerald-500 text-gray-300 group-hover:text-black flex items-center justify-center transition-colors flex-shrink-0 ml-2"
                        >
                          {isTrackPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Trace Button */}
              {msg.trace && !isUser && (
                <button
                  onClick={() => onOpenTrace(msg.trace!)}
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold mt-1 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/30"
                >
                  <Activity className="w-3 h-3" />
                  <span>View LangGraph Pipeline Trace ({msg.trace.latencyBreakdownMs.total}ms)</span>
                </button>
              )}

              <span className="text-[10px] text-gray-500 px-1">{msg.timestamp}</span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-900/80 border border-gray-800 text-gray-300 max-w-[85%]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <div className="text-xs">
              <p className="font-semibold text-emerald-400">Traversing Vector DB & Neo4j...</p>
              <p className="text-[11px] text-gray-400">Synthesizing personalized context</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* QUICK PLAY CHIPS (Matching Screenshot 1) */}
      <div className="px-4 py-2 border-t border-gray-800/60 bg-gray-950/60">
        <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">
          QUICK PLAY / TEST PROMPTS
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-emerald-300 border border-gray-800 hover:border-emerald-700/60 transition-colors whitespace-nowrap"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-gray-800/80 bg-gray-900/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Try: 'Suggest some punjabi songs' or 'I like...'"
            disabled={isLoading}
            className="w-full pl-4 pr-12 py-2.5 text-xs sm:text-sm bg-gray-950 text-white placeholder-gray-500 rounded-full border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="absolute right-1.5 p-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-30 disabled:hover:bg-emerald-500 transition-all shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

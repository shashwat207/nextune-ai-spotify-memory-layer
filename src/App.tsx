import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { MainFeed } from './components/MainFeed';
import { NexTuneAIChat } from './components/NexTuneAIChat';
import { MusicPlayerBar } from './components/MusicPlayerBar';
import { InternalConsoleModal } from './components/InternalConsoleModal';
import { USERS, INITIAL_TRACKS, INITIAL_MEMORIES, INITIAL_GRAPH_NODES, INITIAL_GRAPH_EDGES, INITIAL_POSTGRES_LOGS } from './data/musicCatalog';
import { Track, UserProfile, MemoryItem, KnowledgeNode, KnowledgeEdge, PostgresInteractionLog, WorkflowTrace } from './types';
import { audioEngine } from './utils/audioSynth';

export default function App() {
  // Active User State
  const [activeUser, setActiveUser] = useState<UserProfile>(USERS[0]);

  // Data Collections
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [userMemories, setUserMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES[USERS[0].id] || []);
  const [graphNodes, setGraphNodes] = useState<KnowledgeNode[]>(INITIAL_GRAPH_NODES);
  const [graphEdges, setGraphEdges] = useState<KnowledgeEdge[]>(INITIAL_GRAPH_EDGES);
  const [postgresLogs, setPostgresLogs] = useState<PostgresInteractionLog[]>(INITIAL_POSTGRES_LOGS);

  // Playback State (Matches Screenshot 1 default state: Constellations by Cosmic Kind at 0:02)
  const defaultTrack = INITIAL_TRACKS.find((t) => t.id === 'trk_constellations') || INITIAL_TRACKS[2];
  const [currentTrack, setCurrentTrack] = useState<Track | null>(defaultTrack);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState<number>(2);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI Drawer & Modal State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [externalPrompt, setExternalPrompt] = useState<string>('');
  const [lastTrace, setLastTrace] = useState<WorkflowTrace | undefined>(undefined);

  // Sync state when active user changes
  useEffect(() => {
    setUserMemories(INITIAL_MEMORIES[activeUser.id] || []);
    // Fetch from backend
    fetch(`/api/memories/${activeUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.memories) setUserMemories(data.memories);
      })
      .catch(() => {});

    fetch(`/api/logs/${activeUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) setPostgresLogs(data.logs);
      })
      .catch(() => {});
  }, [activeUser]);

  // Refetch memories helper
  const reloadMemories = () => {
    fetch(`/api/memories/${activeUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.memories) setUserMemories(data.memories);
      })
      .catch(() => {});

    fetch('/api/graph')
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes) setGraphNodes(data.nodes);
        if (data.edges) setGraphEdges(data.edges);
      })
      .catch(() => {});

    fetch(`/api/logs/${activeUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) setPostgresLogs(data.logs);
      })
      .catch(() => {});
  };

  // Playback Controls
  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTimeSeconds(0);

    // Audio Engine play
    audioEngine.playTrack(
      track,
      0,
      (elapsed) => setCurrentTimeSeconds(elapsed),
      () => handleNextTrack()
    );

    // Log PLAY event to Postgres
    const newLog: PostgresInteractionLog = {
      id: `pg_play_${Date.now()}`,
      userId: activeUser.id,
      eventType: 'PLAY',
      trackId: track.id,
      trackTitle: track.title,
      artist: track.artist,
      details: `Started playback: ${track.title} by ${track.artist} (${track.genre})`,
      createdAt: new Date().toISOString(),
    };
    setPostgresLogs((prev) => [newLog, ...prev]);
  };

  const handleTogglePlay = () => {
    if (!currentTrack) {
      if (tracks.length > 0) handlePlayTrack(tracks[0]);
      return;
    }

    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.playTrack(
        currentTrack,
        currentTimeSeconds,
        (elapsed) => setCurrentTimeSeconds(elapsed),
        () => handleNextTrack()
      );
      setIsPlaying(true);
    }
  };

  const handleNextTrack = () => {
    if (!currentTrack) return;
    
    // Check if skipped early (< 15 seconds) to log skip penalty
    if (currentTimeSeconds > 0 && currentTimeSeconds < 15) {
      const skipLog: PostgresInteractionLog = {
        id: `pg_skip_${Date.now()}`,
        userId: activeUser.id,
        eventType: 'SKIP',
        trackId: currentTrack.id,
        trackTitle: currentTrack.title,
        artist: currentTrack.artist,
        details: `Early skip after ${Math.floor(currentTimeSeconds)}s (implicit dislike signal logged)`,
        createdAt: new Date().toISOString(),
      };
      setPostgresLogs((prev) => [skipLog, ...prev]);
    }

    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    handlePlayTrack(tracks[nextIndex]);
  };

  const handlePrevTrack = () => {
    if (!currentTrack) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    handlePlayTrack(tracks[prevIndex]);
  };

  const handleSeek = (seconds: number) => {
    setCurrentTimeSeconds(seconds);
    audioEngine.seek(seconds);
  };

  const handleToggleFavorite = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const newFavState = !t.isFavorite;

          // Log to Postgres
          const favLog: PostgresInteractionLog = {
            id: `pg_fav_${Date.now()}`,
            userId: activeUser.id,
            eventType: 'LIKE',
            trackId: t.id,
            trackTitle: t.title,
            artist: t.artist,
            details: newFavState
              ? `Liked track: ${t.title} (Added to listener taste profile)`
              : `Removed like: ${t.title}`,
            createdAt: new Date().toISOString(),
          };
          setPostgresLogs((l) => [favLog, ...l]);

          return { ...t, isFavorite: newFavState };
        }
        return t;
      })
    );
  };

  const handleDeleteMemory = async (memoryId: string) => {
    setUserMemories((prev) => prev.filter((m) => m.id !== memoryId));
    try {
      await fetch('/api/memories/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUser.id, memoryId }),
      });
      reloadMemories();
    } catch {
      // ignore
    }
  };

  // Search filtered tracks
  const displayedTracks = tracks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q) ||
      t.genre.toLowerCase().includes(q) ||
      t.mood.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070a0e] text-white select-none overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        activeUser={activeUser}
        onSelectUser={setActiveUser}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenConsole={() => setIsConsoleOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        activeMemoryCount={userMemories.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Feed */}
        <MainFeed
          activeUser={activeUser}
          tracks={displayedTracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlayTrack={handlePlayTrack}
          onTogglePlay={handleTogglePlay}
          onToggleFavorite={handleToggleFavorite}
          userMemories={userMemories}
          onOpenAssistantWithPrompt={(prompt) => {
            setExternalPrompt(prompt);
            setIsChatOpen(true);
          }}
          onOpenConsole={() => setIsConsoleOpen(true)}
        />

        {/* NexTune AI Assistant Chat Drawer */}
        <NexTuneAIChat
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          activeUser={activeUser}
          tracks={tracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlayTrack={handlePlayTrack}
          onOpenTrace={(trace) => {
            setLastTrace(trace);
            setIsConsoleOpen(true);
          }}
          externalPrompt={externalPrompt}
          onClearExternalPrompt={() => setExternalPrompt('')}
          onMemoryAdded={reloadMemories}
        />
      </div>

      {/* Bottom Persistent Music Player Bar */}
      <MusicPlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        onToggleFavorite={handleToggleFavorite}
        currentTimeSeconds={currentTimeSeconds}
        onSeek={handleSeek}
        onOpenConsole={() => setIsConsoleOpen(true)}
      />

      {/* Architecture & Engineering Console Modal */}
      <InternalConsoleModal
        isOpen={isConsoleOpen}
        onClose={() => setIsConsoleOpen(false)}
        activeUser={activeUser}
        userMemories={userMemories}
        onDeleteMemory={handleDeleteMemory}
        graphNodes={graphNodes}
        graphEdges={graphEdges}
        postgresLogs={postgresLogs}
        lastTrace={lastTrace}
      />
    </div>
  );
}

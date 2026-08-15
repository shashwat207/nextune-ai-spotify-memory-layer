import React, { useState } from 'react';
import { Play, Pause, Heart, Sparkles, Brain, Radio, ArrowRight, Zap, Flame, Compass, Music, Disc } from 'lucide-react';
import { Track, UserProfile, MemoryItem } from '../types';

interface MainFeedProps {
  activeUser: UserProfile;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  userMemories: MemoryItem[];
  onOpenAssistantWithPrompt: (prompt: string) => void;
  onOpenConsole: () => void;
}

export const MainFeed: React.FC<MainFeedProps> = ({
  activeUser,
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onToggleFavorite,
  userMemories,
  onOpenAssistantWithPrompt,
  onOpenConsole,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  // Dynamic time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const genres = ['All', 'Punjabi', 'Electronic', 'Lo-Fi & Piano', 'Pop', 'Indie'];

  const filteredTracks = tracks.filter((t) => {
    if (selectedGenre === 'All') return true;
    return t.genre.toLowerCase() === selectedGenre.toLowerCase();
  });

  // Highlighted Punjabi recommendations (demonstrating user memory connection)
  const punjabiTracks = tracks.filter(t => t.genre === 'Punjabi');
  const lofiTracks = tracks.filter(t => t.genre === 'Lo-Fi & Piano' || t.genre === 'Electronic');

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 bg-gradient-to-b from-[#0e1620] via-[#090d13] to-[#070a0e] text-gray-100 custom-scrollbar pb-32">
      {/* Hero Banner (Matching Screenshot 1) */}
      <div className="relative rounded-2xl bg-gradient-to-r from-gray-900/90 via-emerald-950/40 to-gray-900/90 border border-emerald-900/30 p-8 shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 uppercase">
            <Sparkles className="w-3 h-3" />
            {getGreeting()}
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Good afternoon, {activeUser.name}
          </h2>

          <p className="text-sm sm:text-base text-gray-300 font-normal leading-relaxed">
            NexTune learns from every play, skip, and chat — then surfaces music you'll actually love.
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-800/90 text-emerald-300 border border-gray-700/80 shadow-sm">
              <Music className="w-3.5 h-3.5 text-emerald-400" />
              <span>Smart playback</span>
            </div>
            <button
              onClick={onOpenConsole}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-800/90 hover:bg-gray-700 text-teal-300 border border-gray-700/80 transition-colors shadow-sm"
            >
              <Brain className="w-3.5 h-3.5 text-teal-400" />
              <span>AI memory ({userMemories.length} active)</span>
            </button>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-800/90 text-amber-300 border border-gray-700/80 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Personalized picks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Callout Strip */}
      {userMemories.length > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/30 text-xs">
          <div className="flex items-center gap-2 text-emerald-200">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-white">Active Vector Preferences:</span>
            <span className="text-gray-300 truncate max-w-xl">
              "{userMemories[0]?.text}"
              {userMemories.length > 1 && ` • "${userMemories[1]?.text}"`}
            </span>
          </div>
          <button
            onClick={onOpenConsole}
            className="text-emerald-400 hover:text-emerald-300 font-semibold underline text-[11px] whitespace-nowrap ml-3"
          >
            Inspect Vector & Graph Data →
          </button>
        </div>
      )}

      {/* Genre Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              selectedGenre === genre
                ? 'bg-white text-black font-semibold shadow-md'
                : 'bg-gray-800/90 hover:bg-gray-700/90 text-gray-300 border border-gray-700/60'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Primary Section: Recommended for You (Matches Screenshot 1 Grid) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Recommended for you</h3>
            <p className="text-xs text-gray-400">
              Personalized via Vector DB similarity and Neo4j graph neighborhood
            </p>
          </div>
          <button
            onClick={() => onOpenAssistantWithPrompt('Recommend new music tailored to my memories')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            Ask AI for deeper picks <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredTracks.map((track) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            return (
              <div
                key={track.id}
                id={`card-${track.id}`}
                onClick={() => onPlayTrack(track)}
                className={`group relative flex flex-col p-3.5 rounded-xl bg-gray-900/60 hover:bg-gray-800/90 border transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl ${
                  currentTrack?.id === track.id
                    ? 'border-emerald-500/80 bg-gray-800/90'
                    : 'border-gray-800/70 hover:border-gray-700'
                }`}
              >
                {/* Album Cover & Play Button Overlay */}
                <div className="relative aspect-square w-full rounded-lg overflow-hidden mb-3 bg-gray-800 shadow-inner">
                  <img
                    src={track.albumArt}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Play/Pause hover trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentTrack?.id === track.id) {
                        onTogglePlay();
                      } else {
                        onPlayTrack(track);
                      }
                    }}
                    className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg transform transition-all duration-200 ${
                      isThisPlaying
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 group-hover:opacity-100 group-hover:scale-100 hover:scale-110'
                    }`}
                  >
                    {isThisPlaying ? (
                      <Pause className="w-5 h-5 fill-black text-black" />
                    ) : (
                      <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
                    )}
                  </button>

                  {/* Favorite button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        track.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-300'
                      }`}
                    />
                  </button>
                </div>

                {/* Track Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
                      {track.title}
                    </h4>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {track.artist} • <span className="text-gray-500">{track.genre}</span>
                    </p>
                  </div>

                  {/* Recommendation Reason Tag */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 truncate">
                      {track.mood}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Punjabi Spotlight Section (Demonstrating LangGraph Seed & Graph Expansion) */}
      <section className="space-y-4 pt-4 border-t border-gray-800/60">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Memory Cluster
              </span>
              <h3 className="text-lg font-bold text-white">Because you enjoy Sidhu Moosewala & High-Energy Punjabi</h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Knowledge Graph paths expanded across Jass Manak, Karan Aujla & Diljit Dosanjh (AP Dhillon excluded)
            </p>
          </div>
          <button
            onClick={() => onOpenAssistantWithPrompt('Suggest some punjabi songs')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            Run Punjabi Query →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {punjabiTracks.slice(0, 4).map((track) => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track)}
              className="flex items-center gap-3.5 p-3 rounded-xl bg-gray-900/50 hover:bg-gray-800/80 border border-gray-800 hover:border-emerald-800/60 cursor-pointer transition-all group"
            >
              <img
                src={track.albumArt}
                alt={track.title}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0 shadow"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate group-hover:text-emerald-400">
                  {track.title}
                </p>
                <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                <span className="text-[10px] text-emerald-400 font-mono">BPM: {track.bpm}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTrack(track);
                }}
                className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <Play className="w-4 h-4 fill-black translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Focus & Lo-Fi Coding Section */}
      <section className="space-y-4 pt-4 border-t border-gray-800/60">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                Deep Work
              </span>
              <h3 className="text-lg font-bold text-white">Focus Beats & Ambient Synth for Late Night</h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Soft piano, rain ambient textures, and synthwave arpeggios
            </p>
          </div>
          <button
            onClick={() => onOpenAssistantWithPrompt('I like soft piano music while working')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            Trigger Focus Mode →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {lofiTracks.slice(0, 4).map((track) => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track)}
              className="flex items-center gap-3.5 p-3 rounded-xl bg-gray-900/50 hover:bg-gray-800/80 border border-gray-800 hover:border-teal-800/60 cursor-pointer transition-all group"
            >
              <img
                src={track.albumArt}
                alt={track.title}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0 shadow"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate group-hover:text-teal-300">
                  {track.title}
                </p>
                <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                <span className="text-[10px] text-teal-400 font-mono">{track.mood}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTrack(track);
                }}
                className="w-8 h-8 rounded-full bg-teal-400 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <Play className="w-4 h-4 fill-black translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

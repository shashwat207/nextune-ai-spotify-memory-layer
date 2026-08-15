import React, { useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Heart, 
  Brain,
  Sliders,
  Sparkles,
  Zap
} from 'lucide-react';
import { Track } from '../types';
import { audioEngine } from '../utils/audioSynth';

interface MusicPlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onToggleFavorite: (trackId: string) => void;
  currentTimeSeconds: number;
  onSeek: (seconds: number) => void;
  onOpenConsole: () => void;
}

export const MusicPlayerBar: React.FC<MusicPlayerBarProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onToggleFavorite,
  currentTimeSeconds,
  onSeek,
  onOpenConsole,
}) => {
  const [volume, setVolume] = useState<number>(0.75);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [visualizerBars, setVisualizerBars] = useState<number[]>([12, 24, 40, 60, 30, 20, 45, 15]);

  // Animate mini audio visualizer when playing
  useEffect(() => {
    if (!isPlaying) {
      setVisualizerBars([4, 4, 4, 4, 4, 4, 4, 4]);
      return;
    }
    const interval = setInterval(() => {
      const data = audioEngine.getFrequencyData();
      if (data && data.length >= 8) {
        const heights = [
          Math.max(6, Math.min(100, data[1] / 2.5)),
          Math.max(6, Math.min(100, data[3] / 2.5)),
          Math.max(6, Math.min(100, data[5] / 2.5)),
          Math.max(6, Math.min(100, data[7] / 2.5)),
          Math.max(6, Math.min(100, data[9] / 2.5)),
          Math.max(6, Math.min(100, data[11] / 2.5)),
          Math.max(6, Math.min(100, data[13] / 2.5)),
          Math.max(6, Math.min(100, data[15] / 2.5)),
        ];
        setVisualizerBars(heights);
      } else {
        // dynamic fallback sine wave
        setVisualizerBars(Array.from({ length: 8 }, () => Math.floor(Math.random() * 60) + 10));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setVolume(newVol);
    if (newVol > 0 && isMuted) setIsMuted(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioEngine.setVolume(volume);
    } else {
      setIsMuted(true);
      audioEngine.setVolume(0);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!currentTrack) {
    return (
      <div className="fixed bottom-0 inset-x-0 h-20 bg-[#090e14]/95 border-t border-gray-800/80 px-6 flex items-center justify-between z-30 backdrop-blur-xl">
        <div className="flex items-center gap-3 text-gray-500 text-xs">
          <Brain className="w-4 h-4 text-emerald-500" />
          <span>Select any track or ask NexTune AI to start personalized playback.</span>
        </div>
      </div>
    );
  }

  const duration = currentTrack.duration || 200;
  const progressPercent = Math.min(100, (currentTimeSeconds / duration) * 100);

  return (
    <div
      id="music-player-bar"
      className="fixed bottom-0 inset-x-0 h-24 bg-[#080d12]/98 border-t border-gray-800/90 px-4 sm:px-6 flex items-center justify-between z-30 backdrop-blur-2xl shadow-2xl"
    >
      {/* Left: Track Information & Favorite (Matches Screenshot 1) */}
      <div className="flex items-center gap-3.5 min-w-[180px] sm:min-w-[240px] max-w-[30%]">
        <div className="relative group w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-md bg-gray-800">
          <img
            src={currentTrack.albumArt}
            alt={currentTrack.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="flex items-end gap-0.5 h-4">
                <span className="w-1 bg-emerald-400 animate-pulse h-3"></span>
                <span className="w-1 bg-emerald-400 animate-pulse h-4 delay-75"></span>
                <span className="w-1 bg-emerald-400 animate-pulse h-2 delay-150"></span>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-semibold text-white truncate">{currentTrack.title}</h4>
            <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50 hidden md:inline">
              {currentTrack.genre}
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate">
            {currentTrack.artist} • <span className="text-gray-500">{currentTrack.album}</span>
          </p>
        </div>

        <button
          onClick={() => onToggleFavorite(currentTrack.id)}
          className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
          title="Favorite / Add to Neo4j Likes"
        >
          <Heart
            className={`w-4 h-4 ${
              currentTrack.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
            }`}
          />
        </button>
      </div>

      {/* Center: Controls and Timeline Scrubber (Matches Screenshot 1) */}
      <div className="flex flex-col items-center max-w-[500px] w-full px-4">
        {/* Buttons Row */}
        <div className="flex items-center gap-4 sm:gap-6 mb-1.5">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-1.5 text-xs transition-colors ${
              isShuffle ? 'text-emerald-400' : 'text-gray-400 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onPrevTrack}
            className="text-gray-300 hover:text-white transition-colors"
            title="Previous Track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            id="player-play-pause"
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-white hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg transition-all transform hover:scale-105"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black translate-x-0.5" />
            )}
          </button>

          <button
            onClick={onNextTrack}
            className="text-gray-300 hover:text-white transition-colors"
            title="Next Track (Skip counts towards Vector dislike penalty if skipped early)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsRepeat(!isRepeat)}
            className={`p-1.5 text-xs transition-colors ${
              isRepeat ? 'text-emerald-400' : 'text-gray-400 hover:text-white'
            }`}
            title="Repeat"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timeline Slider */}
        <div className="w-full flex items-center gap-2.5 text-[11px] font-mono text-gray-400">
          <span className="w-9 text-right">{formatTime(currentTimeSeconds)}</span>
          <div className="relative flex-1 group flex items-center cursor-pointer">
            <input
              type="range"
              min="0"
              max={duration}
              step="1"
              value={currentTimeSeconds}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-400 group-hover:h-1.5 transition-all"
            />
          </div>
          <span className="w-9 text-left">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Audio Visualizer & Volume & Memory Sync */}
      <div className="hidden md:flex items-center gap-4 min-w-[200px] justify-end">
        {/* Equalizer Visualizer */}
        <div className="flex items-end gap-0.5 h-5 px-2 py-1 bg-gray-900/80 rounded border border-gray-800">
          {visualizerBars.map((height, idx) => (
            <div
              key={idx}
              className="w-1 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-t-sm transition-all duration-75"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className="text-gray-400 hover:text-white">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-16 sm:w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        {/* Architecture / Memory Inspector trigger */}
        <button
          onClick={onOpenConsole}
          className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-emerald-400 border border-gray-800 transition-colors"
          title="Inspect RAG & Graph State"
        >
          <Brain className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

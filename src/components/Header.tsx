import React from 'react';
import { Sparkles, Search, Sliders, Database, Network, Disc3, ShieldCheck, User } from 'lucide-react';
import { UserProfile } from '../types';
import { USERS } from '../data/musicCatalog';

interface HeaderProps {
  activeUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenConsole: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  activeMemoryCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeUser,
  onSelectUser,
  searchQuery,
  onSearchChange,
  onOpenConsole,
  onToggleChat,
  isChatOpen,
  activeMemoryCount,
}) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-[#0b1016]/95 backdrop-blur-md border-b border-gray-800/80 shadow-lg">
      {/* Brand & Platform Name */}
      <div className="flex items-center gap-3.5">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-black shadow-lg shadow-emerald-500/20">
          <Disc3 className="w-5 h-5 animate-spin-slow text-black" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              NexTune <span className="text-emerald-400 font-semibold">AI</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
              Spotify Memory Layer
            </span>
          </div>
          <p className="text-[11px] text-gray-400 hidden sm:block">
            LangGraph RAG • Vector DB • Neo4j Graph
          </p>
        </div>
      </div>

      {/* Search Bar & History Navigation (Matches Screenshot 1) */}
      <div className="flex-1 max-w-md mx-4 sm:mx-6 flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 text-gray-400">
          <button className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/80 flex items-center justify-center text-xs text-gray-300 hover:text-white transition-colors border border-gray-800">
            &lt;
          </button>
          <button className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/80 flex items-center justify-center text-xs text-gray-300 hover:text-white transition-colors border border-gray-800">
            &gt;
          </button>
        </div>

        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            id="search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-900/80 text-gray-100 placeholder-gray-500 rounded-full border border-gray-700/60 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 text-xs text-gray-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Controls: AI Assistant Toggle, Internal Architecture Console, User Switcher */}
      <div className="flex items-center gap-3">
        {/* Memory status pill */}
        <button
          onClick={onOpenConsole}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700/80 transition-colors"
          title="Open Spotify Internal AI & Memory Architecture Dashboard"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>{activeMemoryCount} Memories</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1"></span>
        </button>

        {/* Architecture & Engineering Console Button */}
        <button
          id="btn-internal-console"
          onClick={onOpenConsole}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 transition-all hover:scale-[1.02] shadow-sm"
        >
          <Network className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">Architecture Console</span>
          <span className="lg:hidden">Console</span>
        </button>

        {/* NexTune AI Chat Toggle Button */}
        <button
          id="btn-toggle-assistant"
          onClick={onToggleChat}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            isChatOpen
              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/25'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">NexTune AI</span>
        </button>

        {/* User Switcher Dropdown */}
        <div className="relative">
          <button
            id="user-profile-button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-full bg-gray-900/90 hover:bg-gray-800 border border-gray-700/70 text-gray-200 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-xs font-bold text-black ring-1 ring-emerald-400/40">
              {activeUser.initials}
            </div>
            <span className="text-xs font-medium hidden sm:inline max-w-[110px] truncate">
              {activeUser.name}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-gray-900/95 border border-gray-700/90 shadow-2xl p-2 z-50 backdrop-blur-lg">
              <div className="px-3 py-2 border-b border-gray-800">
                <p className="text-xs text-gray-400">Signed in as</p>
                <p className="text-sm font-semibold text-white truncate">{activeUser.name}</p>
                <p className="text-[11px] text-emerald-400 font-mono truncate">{activeUser.email}</p>
              </div>
              <div className="py-1">
                <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                  Switch Listener Profile
                </p>
                {USERS.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u);
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                      u.id === activeUser.id
                        ? 'bg-emerald-950/70 text-emerald-300 font-medium border border-emerald-800/40'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-200">
                      {u.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{u.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{u.handle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

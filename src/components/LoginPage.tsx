import React, { useState } from 'react';
import { Disc3, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed. Please try again.');
        setIsLoading(false);
        return;
      }

      onLoginSuccess(data.user);
    } catch {
      setError('Could not reach the server. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#070a0e] text-white px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-black shadow-lg shadow-emerald-500/20">
            <Disc3 className="w-7 h-7 animate-spin-slow text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              NexTune <span className="text-emerald-400 font-semibold">AI</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">Spotify Memory Layer</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Log in</h2>
            <p className="text-xs text-gray-400">Sign in to see your personalized memory profile.</p>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-xs font-medium text-gray-400">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-black/40 text-gray-100 placeholder-gray-600 rounded-lg border border-gray-700/70 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-xs font-medium text-gray-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full pl-9 pr-9 py-2.5 text-sm bg-black/40 text-gray-100 placeholder-gray-600 rounded-lg border border-gray-700/70 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-700 bg-black/40 accent-emerald-500"
              />
              Remember me
            </label>
            <button type="button" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all shadow-md disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging in...
              </>
            ) : (
              'Log in'
            )}
          </button>

          <p className="text-center text-xs text-gray-500">
            Don't have an account?{' '}
            <button type="button" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Create account
            </button>
          </p>
        </form>

        <div className="text-center text-[11px] text-gray-600 space-y-0.5">
          <p>Demo credentials — any of these emails, password: <span className="text-gray-400 font-mono">nextune123</span></p>
          <p className="font-mono text-gray-500">listener@nextune.ai · demo@nextune.ai</p>
        </div>
      </div>
    </div>
  );
};

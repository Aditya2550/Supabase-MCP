import React, { useState } from 'react';
import { Database, Sun, Moon, Settings, Eye, EyeOff } from 'lucide-react';

export default function Navbar({ 
  isConnected, 
  connectionError, 
  theme, 
  onToggleTheme, 
  supabaseUrl, 
  supabaseKey, 
  onUpdateCredentials 
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [inputUrl, setInputUrl] = useState(supabaseUrl);
  const [inputKey, setInputKey] = useState(supabaseKey);
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateCredentials(inputUrl, inputKey);
    setShowSettings(false);
  };

  return (
    <header className="w-full border-b border-white/10 px-6 py-4 flex items-center justify-between z-20 bg-slate-900/60 backdrop-blur-md relative">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
          <Database className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Supabase Control Panel
          </h1>
          <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">
            Data Explorer & MCP Client
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-white/5">
          <span className="relative flex h-2 w-2">
            {isConnected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : connectionError ? (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 animate-pulse"></span>
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </>
            )}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
            {isConnected ? 'Active' : connectionError ? 'Offline' : 'Connecting'}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl bg-slate-800/80 border border-white/5 hover:bg-slate-700/80 hover:border-white/10 text-slate-300 transition-all flex items-center justify-center cursor-pointer"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
        </button>

        {/* Settings Button */}
        <button
          onClick={() => {
            setInputUrl(supabaseUrl);
            setInputKey(supabaseKey);
            setShowSettings(!showSettings);
          }}
          className="p-2 rounded-xl bg-slate-800/80 border border-white/5 hover:bg-slate-700/80 hover:border-white/10 text-slate-300 transition-all flex items-center justify-center cursor-pointer"
          title="Connection Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 bg-slate-900/95 border-white/10 flex flex-col gap-4 animate-enter shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Connection Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white transition-all text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://your-project.supabase.co"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  <span>API Key (Service Role / Anon)</span>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[9px] text-slate-500 hover:text-slate-300 flex items-center gap-1 focus:outline-none normal-case font-medium cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </label>
                <input
                  type={showKey ? 'text' : 'password'}
                  required
                  placeholder="eyJhbGciOi..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono text-[10px] tracking-wide"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-white/10 mt-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30 transition-all cursor-pointer"
                >
                  Save Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}

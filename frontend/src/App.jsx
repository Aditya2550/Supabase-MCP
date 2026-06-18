import { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import ChatPanel from './components/ChatPanel';
import TableSidebar from './components/TableSidebar';
import DataGrid from './components/DataGrid';
import { supabase as initialSupabase, fetchTables } from './supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { MessageSquare, Database } from 'lucide-react';

export default function App() {
  const [supabaseUrl, setSupabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '');
  const [supabaseKey, setSupabaseKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [supabaseClient, setSupabaseClient] = useState(() => initialSupabase);

  const [tables, setTables] = useState([]);
  const [activeTable, setActiveTable] = useState(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [chatCollapsed, setChatCollapsed] = useState(false);
  
  // Mobile navigation state: 'chat' or 'data'
  const [mobileTab, setMobileTab] = useState('data');

  // Verify connection and load tables list
  const verifyConnection = useCallback(async (clientInstance, url, key) => {
    if (!url || !key) {
      setIsConnected(false);
      setConnectionError('Supabase connection parameters are missing. Click settings to configure.');
      setTables(['products']);
      setActiveTable('products');
      return;
    }

    setLoadingTables(true);
    setConnectionError(null);

    try {
      const list = await fetchTables(url, key);
      setTables(list);

      // Verify connection by checking rest specification
      const response = await fetch(`${url}/rest/v1/`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });

      if (response.ok) {
        setIsConnected(true);
        if (list.length > 0) {
          setActiveTable(prev => list.includes(prev) ? prev : list[0]);
        }
      } else {
        throw new Error(`Connection verification failed (HTTP ${response.status})`);
      }
    } catch (err) {
      console.error('Connection verification failed:', err);
      setIsConnected(false);
      setConnectionError(err.message || 'Connection failed');
      setTables(['products']);
      setActiveTable('products');
    } finally {
      setLoadingTables(false);
    }
  }, []);

  // Run connection verification on start or client changes
  useEffect(() => {
    verifyConnection(supabaseClient, supabaseUrl, supabaseKey);
  }, [supabaseClient, supabaseUrl, supabaseKey, verifyConnection]);

  // Handle credentials updates from Navbar settings
  const handleUpdateCredentials = (newUrl, newKey) => {
    setSupabaseUrl(newUrl);
    setSupabaseKey(newKey);
    const newClient = createClient(newUrl, newKey);
    setSupabaseClient(newClient);
  };

  // Toggle Theme between Dark and Light
  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  const handleMobileTabChat = () => {
    setChatCollapsed(false);
    setMobileTab('chat');
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-all duration-300 ${
      theme === 'dark' 
        ? 'bg-slate-950 text-slate-100' 
        : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Navbar */}
      <Navbar 
        isConnected={isConnected}
        connectionError={connectionError}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        supabaseUrl={supabaseUrl}
        supabaseKey={supabaseKey}
        onUpdateCredentials={handleUpdateCredentials}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Toggle Panel Button (when chat is collapsed on desktop) */}
        {chatCollapsed && (
          <button
            onClick={() => setChatCollapsed(false)}
            className={`hidden lg:flex absolute left-4 bottom-4 p-3 rounded-full border shadow-xl items-center justify-center transition-all z-30 cursor-pointer ${
              theme === 'dark' 
                ? 'bg-slate-900 border-white/10 hover:bg-slate-800 text-emerald-450 hover:text-emerald-400' 
                : 'bg-white border-slate-200 hover:bg-slate-100 text-indigo-650 hover:text-indigo-500'
            }`}
            title="Expand Command Line Panel"
          >
            <MessageSquare className="w-5 h-5 animate-pulse" />
          </button>
        )}

        {/* Left Side: Chat Panel (40%) */}
        {(!chatCollapsed || mobileTab === 'chat') && (
          <ChatPanel 
            activeTable={activeTable}
            onSelectTable={(tbl) => {
              setActiveTable(tbl);
              setMobileTab('data'); // Automatically switch view on selection
            }}
            tables={tables}
            isOpen={mobileTab === 'chat'}
            onToggleCollapse={() => {
              setChatCollapsed(true);
              setMobileTab('data');
            }}
          />
        )}

        {/* Right Side: Data Viewer Container (60%) */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          mobileTab === 'data' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Section Action Bar */}
          <div className={`px-4 py-2 border-b flex items-center justify-between lg:justify-end gap-2 text-xs select-none shrink-0 ${
            theme === 'dark' ? 'bg-slate-900/30 border-white/5' : 'bg-slate-100/50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Table:</span>
              <span className="text-emerald-500 font-extrabold uppercase">{activeTable || 'None'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Desktop Collapse Chat Button */}
              {!chatCollapsed && (
                <button
                  onClick={() => setChatCollapsed(true)}
                  className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-slate-800/40 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white' 
                      : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  Collapse Chat Panel
                </button>
              )}
              {chatCollapsed && (
                <button
                  onClick={() => setChatCollapsed(false)}
                  className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-slate-800/40 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-emerald-400' 
                      : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-indigo-500'
                  }`}
                >
                  Show Chat Panel
                </button>
              )}
            </div>
          </div>

          {/* Table Sidebar + DataGrid Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Table Sidebar */}
            <TableSidebar 
              tables={tables}
              activeTable={activeTable}
              onSelectTable={(tbl) => setActiveTable(tbl)}
              onRefresh={() => verifyConnection(supabaseClient, supabaseUrl, supabaseKey)}
              isLoading={loadingTables}
            />

            {/* Data Grid */}
            <DataGrid 
              tableName={activeTable}
              supabase={supabaseClient}
            />
          </div>
        </div>

      </div>

      {/* Mobile Sticky Tab Selector */}
      <div className={`lg:hidden border-t py-2 px-6 flex items-center justify-around select-none shrink-0 ${
        theme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-white border-slate-200'
      }`}>
        <button
          onClick={handleMobileTabChat}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            mobileTab === 'chat' 
              ? 'text-emerald-500 font-bold' 
              : 'text-slate-500 font-medium'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-[10px]">Command Chat</span>
        </button>
        <button
          onClick={() => setMobileTab('data')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            mobileTab === 'data' 
              ? 'text-emerald-500 font-bold' 
              : 'text-slate-500 font-medium'
          }`}
        >
          <Database className="w-4 h-4" />
          <span className="text-[10px]">Data Viewer</span>
        </button>
      </div>

    </div>
  );
}

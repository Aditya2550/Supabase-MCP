import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, HelpCircle, List, Eye, Trash2, ArrowLeftRight, CornerDownLeft } from 'lucide-react';

export default function ChatPanel({ 
  activeTable, 
  onSelectTable, 
  tables,
  isOpen,
  onToggleCollapse
}) {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hello! I am your Supabase MCP Web Client. You can ask me questions about your database or use commands like `show products` or `list tables`.' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Command interceptor and submit handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const query = input.trim();
    setInput('');
    setHistory(prev => [query, ...prev.filter(item => item !== query)].slice(0, 50));
    setHistoryIndex(-1);

    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setIsLoading(true);

    const lowerQuery = query.toLowerCase().trim();

    // 1. Intercept "show <table>"
    if (lowerQuery.startsWith('show ')) {
      const targetTable = query.substring(5).trim().replace(/['"`]/g, '');
      setIsLoading(false);
      
      const matchedTable = tables.find(t => t.toLowerCase() === targetTable.toLowerCase());
      if (matchedTable) {
        onSelectTable(matchedTable);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I've switched the data viewer to the **${matchedTable}** table. You can inspect, sort, and filter its rows on the right panel.`
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Table **"${targetTable}"** was not found in the database. Discovered tables: ${tables.map(t => `\`${t}\``).join(', ')}.`
        }]);
      }
      return;
    }

    // 2. Intercept "list tables"
    if (lowerQuery === 'list tables' || lowerQuery === 'list' || lowerQuery === 'tables') {
      setIsLoading(false);
      const listMd = tables.map(t => `- \`${t}\``).join('\n');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Here are the tables discovered in your Supabase database:\n\n${listMd}\n\nUse \`show <table>\` to load one into the data viewer.`
      }]);
      return;
    }

    // 3. Intercept "help"
    if (lowerQuery === 'help' || lowerQuery === '?') {
      setIsLoading(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `### Supabase Control Panel Commands\n\nHere are the commands you can run directly in this chat:\n\n* **\`show <table>\`** - Switch the active table in the data viewer (e.g. \`show products\`)\n* **\`list tables\`** - List all tables discovered in the database\n* **\`help\`** or **\`?\`** - Show this help guide\n* **Any natural language query** (e.g. *"Show products in categories"* or *"insert a product"*) - Sent to the Supabase FastMCP agent server (port 8000) for processing.`
      }]);
      return;
    }

    // 4. Default: Forward query to FastMCP FastAPI endpoint
    try {
      const resp = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!resp.ok) {
        throw new Error("Failed to communicate with MCP server.");
      }
      
      const data = await resp.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `**FastMCP Offline (Fallback)**: I received your query *"${query}"*.\n\nSince the MCP Python backend server on port 8000 is not running, I cannot run this request. Start the backend server by running \`python web.py\` or \`uv run web.py\` in the project root.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp' && input.trim() === '') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown' && historyIndex >= 0) {
      e.preventDefault();
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      if (nextIdx === -1) {
        setInput('');
      } else {
        setInput(history[nextIdx]);
      }
    }
  };

  const clearChat = () => {
    setMessages([
      { 
        role: 'assistant', 
        content: 'Chat history cleared. How can I help you manage your Supabase database?' 
      }
    ]);
  };

  const handlePillClick = (cmdText) => {
    setInput(cmdText);
  };

  return (
    <div className={`flex flex-col h-full glass-panel overflow-hidden border-0 rounded-none relative transition-all duration-300 ${isOpen ? 'w-full lg:w-[40%] flex' : 'hidden lg:flex lg:w-[40%]'}`}>
      
      {/* Panel Header */}
      <header className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">AI Assistant Command Line</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={clearChat}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer lg:hidden"
            title="Collapse Panel"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex animate-enter ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user' 
                  ? 'glass-message-user rounded-br-sm shadow-md shadow-blue-500/5' 
                  : 'glass-message-bot rounded-bl-sm shadow-md shadow-black/5'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-xs max-w-none leading-relaxed prose-p:mb-2 last:prose-p:mb-0 prose-pre:bg-slate-950/60 prose-pre:border prose-pre:border-white/5 prose-code:text-emerald-400">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start animate-enter">
            <div className="glass-message-bot rounded-2xl rounded-bl-sm px-4 py-4 max-w-[85%] flex gap-1 items-center">
              <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot"></div>
              <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot"></div>
              <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Pills */}
      <div className="px-4 py-2 border-t border-white/5 bg-slate-900/20 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        <button 
          onClick={() => handlePillClick('help')}
          className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800/60 border border-white/5 hover:border-emerald-500/20 text-slate-300 hover:text-emerald-400 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <HelpCircle className="w-3 h-3" /> Help
        </button>
        <button 
          onClick={() => handlePillClick('list tables')}
          className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800/60 border border-white/5 hover:border-cyan-500/20 text-slate-300 hover:text-cyan-400 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <List className="w-3 h-3" /> List Tables
        </button>
        {tables.includes('products') && (
          <button 
            onClick={() => handlePillClick('show products')}
            className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800/60 border border-white/5 hover:border-indigo-500/20 text-slate-300 hover:text-indigo-400 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Eye className="w-3 h-3" /> Show Products
          </button>
        )}
      </div>

      {/* Input Form Area */}
      <div className="p-4 border-t border-white/10 bg-slate-900/40 backdrop-blur-md z-10">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI, show table, or type command..."
            className="w-full bg-slate-950/40 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none min-h-[44px] max-h-24 transition-all"
            rows={1}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-400/20 transition-all flex items-center justify-center cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="flex justify-between items-center mt-2.5 px-1">
          <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
            <CornerDownLeft className="w-2.5 h-2.5" /> Enter to send
          </span>
          <span className="text-[9px] text-slate-500">
            Shift + Enter for new line
          </span>
        </div>
      </div>

    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your Supabase MCP Web Client. How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const query = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setIsLoading(true);

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
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      
      {/* Container */}
      <div className="glass-panel w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <header className="p-5 border-b border-white/10 flex items-center justify-between z-10 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/30">
              S
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-wide text-white">Supabase MCP Client</h1>
              <p className="text-xs text-slate-400 font-medium">Powered by Groq & Llama 3.3</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Active</span>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex animate-enter ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-5 py-4 ${
                  msg.role === 'user' 
                    ? 'glass-message-user rounded-br-sm' 
                    : 'glass-message-bot rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900/50 prose-pre:border prose-pre:border-white/10">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-enter">
              <div className="glass-message-bot rounded-2xl rounded-bl-sm px-5 py-5 max-w-[85%] sm:max-w-[70%] flex gap-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot"></div>
                <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot"></div>
                <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 border-t border-white/10 bg-slate-900/30 z-10 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2 group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask the Supabase MCP a question..."
              className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-3 pl-4 pr-14 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none min-h-[52px] max-h-32 transition-all"
              rows={1}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-white shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center group-focus-within:ring-2 disabled:shadow-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 translate-x-px">
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            </button>
          </form>
          <div className="text-center mt-3">
             <span className="text-[10px] text-slate-500 font-medium">Press <kbd className="font-sans px-1 py-0.5 rounded border border-slate-700 bg-slate-800">Enter</kbd> to send, <kbd className="font-sans px-1 py-0.5 rounded border border-slate-700 bg-slate-800">Shift</kbd> + <kbd className="font-sans px-1 py-0.5 rounded border border-slate-700 bg-slate-800">Enter</kbd> for newline</span>
          </div>
        </div>

      </div>
    </div>
  );
}

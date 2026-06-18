import React, { useState } from 'react';
import { Table, Search, RefreshCw } from 'lucide-react';

export default function TableSidebar({ 
  tables, 
  activeTable, 
  onSelectTable, 
  onRefresh, 
  isLoading 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTables = tables.filter(t => 
    t.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full md:w-56 lg:w-64 border-r border-white/10 flex flex-col h-full bg-slate-900/30 shrink-0">
      
      {/* Search Header */}
      <div className="p-4 border-b border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Table className="w-3.5 h-3.5 text-emerald-400" /> Tables ({tables.length})
          </span>
          <button 
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            title="Refresh tables list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Tables List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredTables.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-slate-500 italic">No tables found</p>
          </div>
        ) : (
          filteredTables.map((tableName) => {
            const isActive = activeTable === tableName;
            return (
              <button
                key={tableName}
                onClick={() => onSelectTable(tableName)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 font-semibold border-l-2 border-emerald-500 shadow-sm shadow-emerald-500/5' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                }`}
              >
                <Table className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="truncate">{tableName}</span>
              </button>
            );
          })
        )}
      </div>

    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, 
  Search, Plus, X, Eye, RefreshCw, AlertTriangle, Database, FileSpreadsheet, Copy, Check 
} from 'lucide-react';

export default function DataGrid({ tableName, supabase }) {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Query state
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  
  // Sorting
  const [sortColumn, setSortColumn] = useState(null);
  const [sortAscending, setSortAscending] = useState(true);

  // Filtering
  const [filterColumn, setFilterColumn] = useState('');
  const [filterOperator, setFilterOperator] = useState('like');
  const [filterValue, setFilterValue] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);

  // Detail Modal
  const [selectedRow, setSelectedRow] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    if (!tableName || !supabase) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact' });

      // Apply active filters
      activeFilters.forEach(f => {
        const { column, operator, value } = f;
        if (operator === 'eq') {
          query = query.eq(column, value);
        } else if (operator === 'neq') {
          query = query.neq(column, value);
        } else if (operator === 'like') {
          query = query.ilike(column, `%${value}%`);
        } else if (operator === 'gt') {
          query = query.gt(column, value);
        } else if (operator === 'lt') {
          query = query.lt(column, value);
        } else if (operator === 'gte') {
          query = query.gte(column, value);
        } else if (operator === 'lte') {
          query = query.lte(column, value);
        }
      });

      // Apply sorting
      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortAscending });
      } else {
        // Try to default order by 'id' or first column if id doesn't exist
        // to ensure deterministic pagination
      }

      // Apply range (pagination)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: rows, error: fetchErr, count: totalCount } = await query;

      if (fetchErr) throw fetchErr;

      setData(rows || []);
      setCount(totalCount || 0);

      // Extract columns from records
      if (rows && rows.length > 0) {
        setColumns(Object.keys(rows[0]));
      } else {
        // If empty row set, try to preserve column names if we had them or fetch schema
        if (columns.length === 0) {
          // Attempt to query one row without filters to retrieve columns list
          const { data: sampleData } = await supabase.from(tableName).select('*').limit(1);
          if (sampleData && sampleData.length > 0) {
            setColumns(Object.keys(sampleData[0]));
          }
        }
      }
    } catch (err) {
      console.error(`Error fetching table "${tableName}":`, err);
      setError(err.message || 'An error occurred while fetching table data.');
    } finally {
      setLoading(false);
    }
  }, [tableName, supabase, page, sortColumn, sortAscending, activeFilters, columns.length]);

  // Trigger fetch when table, pagination, sorting, or filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset pagination when table or filters change
  useEffect(() => {
    setPage(1);
  }, [tableName, activeFilters]);

  // Set default filter column when columns change
  useEffect(() => {
    if (columns.length > 0 && !filterColumn) {
      setFilterColumn(columns[0]);
    }
  }, [columns, filterColumn]);

  // Handle Sort trigger
  const handleSort = (columnName) => {
    if (sortColumn === columnName) {
      setSortAscending(!sortAscending);
    } else {
      setSortColumn(columnName);
      setSortAscending(true);
    }
  };

  // Add filter
  const handleAddFilter = (e) => {
    e.preventDefault();
    if (!filterColumn || !filterValue.trim()) return;

    const newFilter = {
      id: Date.now(),
      column: filterColumn,
      operator: filterOperator,
      value: filterValue.trim()
    };

    setActiveFilters(prev => [...prev, newFilter]);
    setFilterValue('');
  };

  // Remove individual filter
  const handleRemoveFilter = (filterId) => {
    setActiveFilters(prev => prev.filter(f => f.id !== filterId));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setActiveFilters([]);
  };

  const handleCopyJson = (obj) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render a cell's value cleanly
  const renderCellValue = (val) => {
    if (val === null || val === undefined) return <span className="text-slate-600 italic">null</span>;
    if (typeof val === 'boolean') return val ? <span className="text-emerald-400 font-semibold">true</span> : <span className="text-rose-400 font-semibold">false</span>;
    if (typeof val === 'object') return <span className="text-slate-400 text-[10px] font-mono truncate max-w-[120px] block">{JSON.stringify(val)}</span>;
    return <span className="truncate max-w-[200px] block">{String(val)}</span>;
  };

  if (!tableName) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/10">
        <Database className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <h3 className="text-base font-bold text-slate-300">No Table Selected</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Select a table from the sidebar or type a query command like <code className="text-emerald-400 bg-slate-950/40 px-1 py-0.5 rounded font-mono">show products</code> in the chat panel.
        </p>
      </div>
    );
  }

  // Calculate totals details
  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, count);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/10">
      
      {/* Search & Filter Header */}
      <div className="p-4 border-b border-white/10 bg-slate-900/20 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{tableName}</h3>
            <span className="text-[10px] bg-slate-800/80 border border-white/5 text-slate-400 px-2 py-0.5 rounded-full font-bold">
              {count} rows
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Builder */}
        <form onSubmit={handleAddFilter} className="flex flex-wrap gap-2 items-center">
          <select
            value={filterColumn}
            onChange={(e) => setFilterColumn(e.target.value)}
            className="bg-slate-950/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
          >
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>

          <select
            value={filterOperator}
            onChange={(e) => setFilterOperator(e.target.value)}
            className="bg-slate-950/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
          >
            <option value="like">contains</option>
            <option value="eq">equals (=)</option>
            <option value="neq">not equals (!=)</option>
            <option value="gt">greater than (&gt;)</option>
            <option value="lt">less than (&lt;)</option>
            <option value="gte">greater or equal (&gt;=)</option>
            <option value="lte">less or equal (&lt;=)</option>
          </select>

          <div className="relative flex-1 min-w-[150px] max-w-xs">
            <input
              type="text"
              placeholder="Filter value..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1 p-1 rounded-lg text-emerald-400 hover:bg-white/5 cursor-pointer"
              title="Add filter"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[10px] text-slate-400 hover:text-rose-400 transition-all font-semibold cursor-pointer"
            >
              Clear All
            </button>
          )}
        </form>

        {/* Filter Badges */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {activeFilters.map(f => (
              <span 
                key={f.id}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium"
              >
                <span>{f.column} {f.operator} '{f.value}'</span>
                <button 
                  type="button" 
                  onClick={() => handleRemoveFilter(f.id)}
                  className="p-0.5 rounded-full hover:bg-emerald-500/20 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-auto relative">
        {loading && data.length === 0 ? (
          /* Skeleton Loader */
          <div className="p-4 space-y-4">
            <div className="h-6 bg-slate-800/40 rounded-lg animate-pulse w-full"></div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-8 bg-slate-800/20 rounded-lg animate-pulse flex-1"></div>
                <div className="h-8 bg-slate-800/20 rounded-lg animate-pulse flex-1"></div>
                <div className="h-8 bg-slate-800/20 rounded-lg animate-pulse flex-1"></div>
                <div className="h-8 bg-slate-800/20 rounded-lg animate-pulse flex-1"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-500 mb-2 animate-bounce" />
            <h4 className="text-sm font-bold text-slate-300">Failed to load data</h4>
            <p className="text-xs text-rose-400/80 max-w-md mt-1 font-mono text-[10px] bg-rose-950/20 border border-rose-500/15 p-3 rounded-xl">
              {error}
            </p>
            <button 
              onClick={fetchData}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Fetch
            </button>
          </div>
        ) : data.length === 0 ? (
          /* Empty State */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <Database className="w-10 h-10 text-slate-700 mb-2" />
            <h4 className="text-sm font-bold text-slate-400">No records found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              No rows match the specified search filters in table <code className="text-slate-400">{tableName}</code>.
            </p>
            {activeFilters.length > 0 && (
              <button
                onClick={handleClearFilters}
                className="mt-3 text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          /* Main Data Table */
          <table className="w-full text-left border-collapse text-xs select-text">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/40 sticky top-0 backdrop-blur z-10">
                <th className="p-3 w-12 text-center text-slate-400 font-bold">Actions</th>
                {columns.map(col => {
                  const isSorted = sortColumn === col;
                  return (
                    <th 
                      key={col}
                      onClick={() => handleSort(col)}
                      className="p-3 text-slate-300 font-semibold cursor-pointer hover:bg-white/5 transition-all select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono">{col}</span>
                        {isSorted ? (
                          sortAscending ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600 hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr 
                  key={index} 
                  className="border-b border-white/5 hover:bg-white/5 transition-all"
                >
                  <td className="p-2 text-center">
                    <button
                      onClick={() => setSelectedRow(row)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                      title="Inspect record JSON"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  {columns.map(col => (
                    <td key={col} className="p-3 text-slate-300 font-mono text-[11px] max-w-[250px] truncate">
                      {renderCellValue(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {data.length > 0 && (
        <div className="p-4 border-t border-white/10 bg-slate-900/30 flex items-center justify-between gap-4 text-xs select-none">
          <span className="text-slate-400 font-medium">
            Showing <strong className="text-white font-bold">{startRow}</strong> to <strong className="text-white font-bold">{endRow}</strong> of <strong className="text-white font-bold">{count}</strong> rows
          </span>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-1.5 rounded-lg bg-slate-800 border border-white/5 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="px-3 py-1 bg-slate-950/40 border border-white/5 rounded-lg font-bold text-white text-[11px]">
              Page {page} of {Math.ceil(count / pageSize) || 1}
            </span>
            
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(count / pageSize), p + 1))}
              disabled={page >= Math.ceil(count / pageSize) || loading}
              className="p-1.5 rounded-lg bg-slate-800 border border-white/5 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail JSON Modal */}
      {selectedRow && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-5 bg-slate-950 border-white/15 flex flex-col gap-4 animate-enter shadow-2xl rounded-2xl max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 select-none">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Inspect Record</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyJson(selectedRow)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Copy JSON to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setSelectedRow(null)}
                  className="text-slate-400 hover:text-white transition-all text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-900/50 border border-white/5 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-200">
              <pre className="whitespace-pre-wrap select-text">{JSON.stringify(selectedRow, null, 2)}</pre>
            </div>
            
            <div className="flex justify-end select-none">
              <button
                onClick={() => setSelectedRow(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

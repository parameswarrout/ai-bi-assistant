"use client";

import React, { useState, useEffect } from "react";
import { Table, ArrowRight, Loader2, Database, AlertCircle, RefreshCw } from "lucide-react";

interface ExplorerProps {
  apiBaseUrl: string;
}

const TABLES = [
  { name: "customers", description: "1,000 customers registered over the last 2 years" },
  { name: "products", description: "100 products cataloged across 6 business categories" },
  { name: "orders", description: "10,000 transaction orders representing sales history" },
  { name: "employees", description: "100 corporate employees in departments across locations" },
  { name: "payments", description: "10,000 payment details matching generated orders" }
];

export default function Explorer({ apiBaseUrl }: ExplorerProps) {
  const [selectedTable, setSelectedTable] = useState(TABLES[0].name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchTableData = async (tableName: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/explorer/${tableName}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch table data: ${response.statusText}`);
      }

      const resData = await response.json();
      if (resData.error) {
        throw new Error(resData.error);
      }

      if (resData.data && resData.data.length > 0) {
        setRows(resData.data);
        setColumns(Object.keys(resData.data[0]));
      } else {
        setRows([]);
        setColumns([]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while loading table records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData(selectedTable);
  }, [selectedTable]);

  // Filter rows locally based on search term
  const filteredRows = rows.filter(row => {
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Database className="w-6 h-6 text-violet-400" /> Database Explorer
          </h2>
          <p className="text-sm text-zinc-400">Direct inspect of SQLite database tables (limited to top 100 rows).</p>
        </div>
        <button 
          onClick={() => fetchTableData(selectedTable)} 
          className="flex items-center gap-1.5 text-xs bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 px-3 py-2 rounded-lg transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Reload
        </button>
      </div>

      {/* Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {TABLES.map((t) => (
          <button
            key={t.name}
            onClick={() => {
              setSearchTerm("");
              setSelectedTable(t.name);
            }}
            className={`text-left p-3.5 rounded-xl border transition-all duration-200 ${
              selectedTable === t.name
                ? "bg-violet-600/10 border-violet-500 text-violet-300"
                : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="font-mono text-xs uppercase font-bold tracking-wider block mb-1">
              {t.name}
            </span>
            <span className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">
              {t.description}
            </span>
          </button>
        ))}
      </div>

      {/* Main Panel */}
      <div className="glass-card rounded-xl overflow-hidden flex flex-col">
        {/* Actions Bar */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded font-mono uppercase tracking-wider">
              {selectedTable}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {rows.length > 0 ? `Showing ${filteredRows.length} of ${rows.length} records` : "0 records"}
            </span>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Filter ${selectedTable}...`}
            className="bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none w-full sm:w-64 transition"
          />
        </div>

        {/* Table Container */}
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-3" />
            <p className="text-xs text-zinc-400 font-medium">Running SELECT query on SQLite...</p>
          </div>
        ) : error ? (
          <div className="h-96 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl max-w-sm flex flex-col items-center">
              <AlertCircle className="w-8 h-8 mb-2" />
              <span className="font-bold block mb-1">Query Failed</span>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-zinc-500 text-xs">
            No rows returned from this table.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-semibold sticky top-0 backdrop-blur z-[1]">
                  {columns.map((col) => (
                    <th key={col} className="p-3 border-r border-zinc-800/40 min-w-[120px] font-bold uppercase tracking-wider font-mono text-[10px]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, rIdx) => (
                  <tr 
                    key={rIdx} 
                    className="border-b border-zinc-800/60 hover:bg-zinc-900/35 text-zinc-300 font-mono text-[11px]"
                  >
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className="p-3 border-r border-zinc-800/30 truncate max-w-[200px]">
                        {row[col] === null || row[col] === undefined ? (
                          <span className="text-zinc-600 italic">null</span>
                        ) : (
                          String(row[col])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 && (
              <div className="p-8 text-center text-zinc-500">
                No matching records found for "{searchTerm}".
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tips Banner */}
      <div className="flex gap-3 bg-violet-600/5 border border-violet-500/10 p-4 rounded-xl text-zinc-400 text-xs leading-relaxed">
        <Database className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-zinc-200 block mb-0.5">How this page works</span>
          This explorer connects directly to the SQLite instance using safe, read-only SQL requests. All relationships, timestamps, and amounts are generated dynamically during the startup database seeding phase, assuring an integrated data schema.
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { 
  Trash2, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Code, 
  Table, 
  PinOff,
  Sparkles,
  BarChart3
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  Legend 
} from "recharts";

interface PinnedInsight {
  id: string;
  message: string; // User Query
  sql: string;
  data: any[];
  chart_type: string;
  x_axis_key?: string;
  y_axis_key?: string;
  answer: string;
  pinnedAt: string;
}

interface PinsGalleryProps {
  pinnedInsights: PinnedInsight[];
  onUnpin: (id: string) => void;
}

const CHART_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#84cc16"];

export default function PinsGallery({ pinnedInsights, onUnpin }: PinsGalleryProps) {
  const [expandedSql, setExpandedSql] = useState<Record<string, boolean>>({});
  const [expandedSummary, setExpandedSummary] = useState<Record<string, boolean>>({});

  const toggleSql = (id: string) => {
    setExpandedSql(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSummary = (id: string) => {
    setExpandedSummary(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(val);
  };

  const renderCardChart = (insight: PinnedInsight) => {
    const { chart_type, data, x_axis_key, y_axis_key } = insight;
    if (!x_axis_key || !y_axis_key || chart_type === "NONE" || !data || data.length === 0) return null;

    if (chart_type === "AREA") {
      const chartData = data.slice(0, 30);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id={`pinnedColor-${insight.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey={x_axis_key} stroke="#71717a" style={{ fontSize: "9px" }} />
            <YAxis stroke="#71717a" style={{ fontSize: "9px" }} tickFormatter={(val) => val >= 1000 ? `$${val / 1000}k` : `$${val}`} />
            <Tooltip 
              contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "10px" }}
              formatter={(value: any) => [y_axis_key.toLowerCase().includes("revenue") || y_axis_key.toLowerCase().includes("amount") ? formatCurrency(value) : value, y_axis_key]}
            />
            <Area type="monotone" dataKey={y_axis_key} stroke="#8b5cf6" strokeWidth={1.5} fillOpacity={1} fill={`url(#pinnedColor-${insight.id})`} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chart_type === "BAR") {
      const chartData = data.slice(0, 15);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey={x_axis_key} stroke="#71717a" style={{ fontSize: "9px" }} tickFormatter={(val) => String(val).split(" ")[0]} />
            <YAxis stroke="#71717a" style={{ fontSize: "9px" }} tickFormatter={(val) => val >= 1000 ? `$${val / 1000}k` : `$${val}`} />
            <Tooltip 
              contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "10px" }}
              formatter={(value: any) => [y_axis_key.toLowerCase().includes("revenue") || y_axis_key.toLowerCase().includes("amount") ? formatCurrency(value) : value, y_axis_key]}
            />
            <Bar dataKey={y_axis_key} fill="#3b82f6" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chart_type === "PIE") {
      const chartData = data.slice(0, 10);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={50}
              paddingAngle={3}
              dataKey={y_axis_key}
              nameKey={x_axis_key}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "10px" }}
              formatter={(value: any) => [y_axis_key.toLowerCase().includes("revenue") || y_axis_key.toLowerCase().includes("amount") ? formatCurrency(value) : value, "Value"]}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-violet-400" /> Pinned Insights Pinboard
        </h2>
        <p className="text-sm text-zinc-400">
          Access your pinned analytics reports, visualization cards, and compiled SQL statements.
        </p>
      </div>

      {pinnedInsights.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-2xl p-12 text-center max-w-xl mx-auto mt-12 bg-zinc-900/10">
          <PinOff className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-zinc-300">No pinned insights yet</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Go to the **Agent Workspace** tab, run analyses on products, sales, or customer data, and click the pin icon on top of deliverables to save widgets here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {pinnedInsights.map((insight) => {
            const isSqlOpen = !!expandedSql[insight.id];
            const isSummaryOpen = !!expandedSummary[insight.id];

            return (
              <div 
                key={insight.id} 
                className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex flex-col space-y-4 hover:border-violet-500/25 transition-all duration-300 relative group glass-card"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-zinc-200 leading-snug line-clamp-2">
                      {insight.message}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-medium">
                      <Calendar className="w-3 h-3 text-zinc-650" />
                      <span>Saved: {insight.pinnedAt}</span>
                      <span className="text-zinc-700">•</span>
                      <span className="text-violet-400 font-mono text-[8px] uppercase tracking-wider">{insight.chart_type} Chart</span>
                    </div>
                  </div>

                  {/* Unpin Button */}
                  <button
                    onClick={() => onUnpin(insight.id)}
                    className="p-1.5 bg-zinc-900/50 border border-zinc-800 hover:border-red-500/35 text-zinc-500 hover:text-red-400 rounded-lg transition duration-150 shrink-0"
                    title="Unpin Widget"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Graph Area */}
                {insight.chart_type !== "NONE" && (
                  <div className="h-44 w-full bg-zinc-950/40 rounded-xl border border-zinc-850/50 p-3">
                    {renderCardChart(insight)}
                  </div>
                )}

                {/* Collapsible Executive Summary */}
                <div className="border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/30">
                  <button
                    onClick={() => toggleSummary(insight.id)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-zinc-950/40 hover:bg-zinc-950/60 text-[10px] text-zinc-400 hover:text-zinc-200 font-bold tracking-wide uppercase transition duration-150"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Strategic Summary
                    </span>
                    {isSummaryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {isSummaryOpen && (
                    <div className="p-3 text-[10px] text-zinc-300 border-t border-zinc-900 leading-relaxed font-sans whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {insight.answer}
                    </div>
                  )}
                </div>

                {/* Collapsible SQL */}
                {insight.sql && (
                  <div className="border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/30">
                    <button
                      onClick={() => toggleSql(insight.id)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-zinc-950/40 hover:bg-zinc-950/60 text-[10px] text-zinc-400 hover:text-zinc-200 font-bold tracking-wide uppercase transition duration-150"
                    >
                      <span className="flex items-center gap-1.5 font-mono">
                        <Code className="w-3.5 h-3.5 text-violet-400" /> Compiled SQL
                      </span>
                      {isSqlOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {isSqlOpen && (
                      <pre className="p-3 text-[9px] font-mono text-zinc-400 overflow-x-auto whitespace-pre-wrap max-h-24 border-t border-zinc-900 bg-zinc-950/80 leading-normal">
                        {insight.sql}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

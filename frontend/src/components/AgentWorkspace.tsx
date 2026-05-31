"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Users, 
  Send, 
  Bot, 
  ShieldAlert, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Table, 
  Code, 
  Loader2, 
  Sparkles, 
  Cpu,
  Mic,
  Download,
  Printer,
  Pin,
  PinOff
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

interface AgentLog {
  agent_name: string;
  avatar: string;
  role: string;
  message: string;
  timestamp: string;
}

interface AnalysisResult {
  dialogue: AgentLog[];
  sql: string;
  data: any[];
  chart_type: string;
  x_axis_key?: string;
  y_axis_key?: string;
  answer: string;
}

interface PinnedInsight {
  id: string;
  message: string;
  sql: string;
  data: any[];
  chart_type: string;
  x_axis_key?: string;
  y_axis_key?: string;
  answer: string;
  pinnedAt: string;
}

interface AgentWorkspaceProps {
  apiBaseUrl: string;
  pinnedInsights: PinnedInsight[];
  onTogglePin: (insight: any) => void;
}

const AGENT_PROFILES = [
  { name: "SQL Engineer 🛠️", role: "Query Specialist", desc: "Translates business briefs into SQLite syntax.", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { name: "Risk Auditor 🛡️", role: "Security Auditor", desc: "Performs strict read-only query sandboxing.", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { name: "Performance DBA ⚡", role: "Database Optimizer", desc: "Runs EXPLAIN plans to analyze query paths and index efficiency.", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  { name: "Quality Control 🔍", role: "Data QC Auditor", desc: "Inspects value range boundaries, formats, and null percentages.", color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  { name: "Design Agent 🎨", role: "UI & Visualizer", desc: "Auto-maps datasets to optimal Recharts styles.", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  { name: "Strategist Agent 📈", role: "Business Director", desc: "Drives corporate growth insights from data.", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { name: "Trend Forecaster 🔮", role: "Predictive Analyst", desc: "Extrapolates time-series trends and quarterly projections.", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  { name: "Action Planner 🎯", role: "Operations Planner", desc: "Translates insights into 3 immediate operational next steps.", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" }
];

const SUGGESTIONS = [
  "Compare sales between North and South regions",
  "Show me monthly revenue for the last year",
  "What are the best selling products?",
  "Which category is declining?",
  "Top 10 customers by revenue"
];

const CHART_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#84cc16"];

export default function AgentWorkspace({ apiBaseUrl, pinnedInsights, onTogglePin }: AgentWorkspaceProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Collaboration trace states
  const [workspaceHistory, setWorkspaceHistory] = useState<{ sender: string; text: string }[]>([]);
  const [userQuery, setUserQuery] = useState<string | null>(null);
  const [visibleDialogue, setVisibleDialogue] = useState<AgentLog[]>([]);
  const [allDialogue, setAllDialogue] = useState<AgentLog[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  
  // UI Toggles
  const [sqlExpanded, setSqlExpanded] = useState(true);
  const [tableExpanded, setTableExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const timelineEndRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<any[]>([]);

  // Resizing logic for Deliverables Brief
  const [deliverablesWidth, setDeliverablesWidth] = useState(520); // Default to larger 520px
  const isResizing = useRef(false);
  const deliverablesRef = useRef<HTMLDivElement>(null);
  const startWidthRef = useRef<number>(520);
  const startXRef = useRef<number>(0);

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    isResizing.current = true;
    if (deliverablesRef.current) {
      startWidthRef.current = deliverablesRef.current.getBoundingClientRect().width;
    }
    startXRef.current = mouseDownEvent.clientX;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
    if (!isResizing.current) return;
    const deltaX = mouseMoveEvent.clientX - startXRef.current;
    const newWidth = startWidthRef.current - deltaX;
    if (newWidth >= 320 && newWidth <= 950) {
      setDeliverablesWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Clear timeouts and mouse listeners on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [deliverablesWidth]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.error("Speech recognition error:", event.error);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const exportToCSV = () => {
    if (!analysisResult || !analysisResult.data || analysisResult.data.length === 0) return;
    const headers = Object.keys(analysisResult.data[0]);
    const rows = analysisResult.data.map(row => 
      headers.map(header => {
        const val = row[header];
        const cell = val === null || val === undefined ? "" : String(val).replace(/"/g, '""');
        return `"${cell}"`;
      }).join(",")
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bi_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPinned = analysisResult && userQuery 
    ? pinnedInsights.some(pin => pin.message === userQuery && pin.sql === analysisResult.sql) 
    : false;

  const handlePinToggle = () => {
    if (!analysisResult || !userQuery) return;
    onTogglePin({
      id: userQuery,
      message: userQuery,
      sql: analysisResult.sql,
      data: analysisResult.data,
      chart_type: analysisResult.chart_type,
      x_axis_key: analysisResult.x_axis_key,
      y_axis_key: analysisResult.y_axis_key,
      answer: analysisResult.answer
    });
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    // Clear any active dialogue animations
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    
    const currentHistory = [...workspaceHistory];

    setInputText("");
    setUserQuery(text);
    setLoading(true);
    setError(null);
    setVisibleDialogue([]);
    setAllDialogue([]);
    setAnalysisResult(null);
    setActiveAgent(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat/collaborative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text,
          history: currentHistory
        }),
      });

      if (!response.ok) {
        throw new Error(`Collaboration API returned code ${response.status}`);
      }

      const resData: AnalysisResult = await response.json();
      setAllDialogue(resData.dialogue);
      setAnalysisResult(resData);

      // Play dialogue animation sequentially
      playSequentialDialogue(resData.dialogue, resData, text);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to establish a workflow with the agent team.");
      setLoading(false);
    }
  };

  const playSequentialDialogue = (logs: AgentLog[], finalData: AnalysisResult, queryText: string) => {
    let index = 0;
    
    const showNextAgentMsg = () => {
      if (index < logs.length) {
        const nextMsg = logs[index];
        if (nextMsg) {
          setActiveAgent(nextMsg.agent_name);
          setVisibleDialogue(prev => [...prev, nextMsg]);
        }
        index++;
        
        // Scroll to timeline bottom
        const scrollTimeout = setTimeout(() => {
          timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
        timeoutsRef.current.push(scrollTimeout);

        // Schedule next step (adds a nice, human-like delay between agents)
        const nextTimeout = setTimeout(showNextAgentMsg, 1600);
        timeoutsRef.current.push(nextTimeout);
      } else {
        // Dialogue completed, display final results
        setActiveAgent(null);
        setLoading(false);
        setWorkspaceHistory(prev => [
          ...prev,
          { sender: "user", text: queryText },
          { sender: "assistant", text: finalData.answer }
        ]);
      }
    };

    showNextAgentMsg();
  };

  const getAgentAvatar = (name: string) => {
    if (name.includes("Engineer")) return <span className="text-[13px] select-none">🛠️</span>;
    if (name.includes("Auditor")) return <span className="text-[13px] select-none">🛡️</span>;
    if (name.includes("DBA")) return <span className="text-[13px] select-none">⚡</span>;
    if (name.includes("Control")) return <span className="text-[13px] select-none">🔍</span>;
    if (name.includes("Designer") || name.includes("Design")) return <span className="text-[13px] select-none">🎨</span>;
    if (name.includes("Strategist")) return <span className="text-[13px] select-none">📈</span>;
    if (name.includes("Forecaster")) return <span className="text-[13px] select-none">🔮</span>;
    if (name.includes("Planner")) return <span className="text-[13px] select-none">🎯</span>;
    return <span className="text-[13px] select-none">🤖</span>;
  };

  // Render Recharts dynamically
  const renderRecharts = () => {
    if (!mounted) return null;
    if (!analysisResult || !analysisResult.data || analysisResult.data.length === 0) return null;
    const { chart_type, data, x_axis_key, y_axis_key } = analysisResult;

    if (!x_axis_key || !y_axis_key || chart_type === "NONE") return null;

    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }).format(val);
    };

    if (chart_type === "AREA") {
      const chartData = data.slice(0, 30);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="agentColorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey={x_axis_key} stroke="#71717a" style={{ fontSize: "11px" }} />
            <YAxis stroke="#71717a" style={{ fontSize: "11px" }} tickFormatter={(val) => val >= 1000 ? `$${val / 1000}k` : `$${val}`} />
            <Tooltip 
              contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
              formatter={(value: any) => [y_axis_key.toLowerCase().includes("revenue") || y_axis_key.toLowerCase().includes("amount") ? formatCurrency(value) : value, y_axis_key]}
            />
            <Area type="monotone" dataKey={y_axis_key} stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#agentColorRev)" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chart_type === "BAR") {
      const chartData = data.slice(0, 15);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey={x_axis_key} stroke="#71717a" style={{ fontSize: "11px" }} tickFormatter={(val) => String(val).split(" ")[0]} />
            <YAxis stroke="#71717a" style={{ fontSize: "11px" }} tickFormatter={(val) => val >= 1000 ? `$${val / 1000}k` : `$${val}`} />
            <Tooltip 
              contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
              formatter={(value: any) => [y_axis_key.toLowerCase().includes("revenue") || y_axis_key.toLowerCase().includes("amount") ? formatCurrency(value) : value, y_axis_key]}
            />
            <Bar dataKey={y_axis_key} fill="#3b82f6" radius={[4, 4, 0, 0]}>
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
              innerRadius={50}
              outerRadius={75}
              paddingAngle={5}
              dataKey={y_axis_key}
              nameKey={x_axis_key}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
              formatter={(value: any) => [y_axis_key.toLowerCase().includes("revenue") || y_axis_key.toLowerCase().includes("amount") ? formatCurrency(value) : value, "Value"]}
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-5 no-print">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <Users className="w-6 h-6 text-violet-400" /> Multi-Agent Analyst Workspace
        </h2>
        <p className="text-sm text-zinc-400">
          Leverage a team of specialized AI agents working sequentially to extract database queries and map statistics.
        </p>
      </div>

      {/* Specialist Team Bios / Collaborative Control Center */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {AGENT_PROFILES.map((agent) => {
          const hasLogged = visibleDialogue.some(d => d.agent_name === agent.name);
          const isActive = activeAgent === agent.name;
          
          let cardStyle = "bg-zinc-900/40 border-zinc-800/85 text-zinc-400 opacity-60";
          let statusLabel = "Idle";
          let statusBadgeColor = "bg-zinc-800/40 text-zinc-500 border-zinc-800";
          
          if (isActive) {
            cardStyle = "bg-violet-950/15 border-violet-500/40 text-zinc-100 ring-1 ring-violet-500/25 scale-[1.02] shadow-lg shadow-violet-500/5";
            statusLabel = "Thinking...";
            statusBadgeColor = "bg-violet-500/20 text-violet-300 border-violet-500/30 animate-pulse";
          } else if (hasLogged) {
            cardStyle = "bg-zinc-900/90 border-zinc-800 text-zinc-300 opacity-100";
            statusLabel = "Completed";
            statusBadgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
          } else if (loading) {
            cardStyle = "bg-zinc-900/20 border-zinc-900/40 text-zinc-500 opacity-40";
            statusLabel = "Queued";
            statusBadgeColor = "bg-zinc-950 text-zinc-600 border-zinc-900";
          }

          return (
            <div 
              key={agent.name} 
              className={`p-4 rounded-xl border space-y-1.5 transition-all duration-300 relative overflow-hidden glass-card ${cardStyle}`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-200 block">{agent.name}</span>
                <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded-full border font-mono font-bold tracking-wider ${statusBadgeColor}`}>
                  {statusLabel}
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400 font-mono block">
                {agent.role}
              </span>
              <p className="text-[11px] leading-relaxed">
                {agent.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Suggestions and Chat Input */}
      <div className="space-y-3 suggestions-row no-print">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSendMessage(s)}
              disabled={loading}
              className="text-xs bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50 disabled:pointer-events-none"
            >
              {s}
            </button>
          ))}
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="flex gap-2 items-center"
        >
          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              placeholder="Instruct the agent team... (e.g. Compare regional revenue between East and West)"
              className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-violet-500 rounded-xl pl-4 pr-11 py-3 text-xs text-zinc-100 placeholder-zinc-500 outline-none transition disabled:opacity-50"
            />
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`absolute right-3 p-1.5 rounded-lg transition duration-155 hover:bg-zinc-800 ${
                isRecording ? "text-red-500 animate-pulse" : "text-zinc-400 hover:text-zinc-200"
              }`}
              title={isRecording ? "Stop voice input" : "Start voice input (microphone)"}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="p-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl disabled:bg-zinc-800 disabled:text-zinc-500 transition duration-150 shrink-0 flex items-center justify-center shadow-lg shadow-violet-600/10"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {/* Collaboration Window & Timeline */}
      {userQuery && (
        <div className="flex flex-col lg:flex-row gap-4 pt-4 items-stretch min-h-0">
          
          {/* Left/Middle Column: Collaboration timeline */}
          <div className="flex-1 space-y-4 flex flex-col min-w-[300px] timeline-col no-print">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Dialogue timeline
              </h3>
              {workspaceHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceHistory([]);
                    setUserQuery(null);
                    setVisibleDialogue([]);
                    setAllDialogue([]);
                    setAnalysisResult(null);
                  }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded no-print"
                >
                  Clear Thread Context
                </button>
              )}
            </div>
            
            <div className="border border-zinc-800 rounded-xl bg-zinc-950/30 overflow-hidden flex-1 flex flex-col min-h-[400px]">
              {/* Timeline dialogue trace */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[500px]">
                {/* Render Past Conversation Turns */}
                {workspaceHistory.map((item, hIdx) => (
                  <div key={`hist-${hIdx}`} className={`flex gap-3 ${item.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`${
                      item.sender === "user" 
                        ? "bg-violet-600/10 border border-violet-500/25 p-3 rounded-2xl rounded-tr-none text-zinc-200" 
                        : "bg-zinc-900/50 border border-zinc-805 p-3 rounded-2xl rounded-tl-none text-zinc-300"
                    } text-xs max-w-[80%] shadow-sm whitespace-pre-wrap`}>
                      <span className={`text-[9px] font-bold block mb-1 ${item.sender === "user" ? "text-violet-400" : "text-amber-400"}`}>
                        {item.sender === "user" ? "User Query" : "Strategist Agent 📈 (Previous Summary)"}
                      </span>
                      {item.text}
                    </div>
                  </div>
                ))}

                {/* User Prompt */}
                <div className="flex gap-3 justify-end">
                  <div className="bg-violet-600/10 border border-violet-500/25 p-3 rounded-2xl rounded-tr-none text-zinc-200 text-xs max-w-[80%] shadow-sm">
                    <span className="text-[10px] font-bold text-violet-400 block mb-1">User Query</span>
                    {userQuery}
                  </div>
                </div>

                {/* Agent replies */}
                {visibleDialogue.map((log, idx) => {
                  if (!log || !log.agent_name) return null;
                  let borderCol = "border-zinc-800 bg-zinc-900/20";
                  let avatarBorder = "border-zinc-800 bg-zinc-900";
                  
                  if (log.agent_name.includes("Auditor")) {
                    borderCol = "border-emerald-500/20 bg-emerald-500/5";
                    avatarBorder = "border-emerald-500/35 bg-emerald-950/20";
                  }
                  if (log.agent_name.includes("Engineer")) {
                    borderCol = "border-blue-500/20 bg-blue-500/5";
                    avatarBorder = "border-blue-500/35 bg-blue-950/20";
                  }
                  if (log.agent_name.includes("DBA")) {
                    borderCol = "border-cyan-500/20 bg-cyan-500/5";
                    avatarBorder = "border-cyan-500/35 bg-cyan-950/20";
                  }
                  if (log.agent_name.includes("Control")) {
                    borderCol = "border-teal-500/20 bg-teal-500/5";
                    avatarBorder = "border-teal-500/35 bg-teal-950/20";
                  }
                  if (log.agent_name.includes("Designer") || log.agent_name.includes("Design")) {
                    borderCol = "border-violet-500/20 bg-violet-500/5";
                    avatarBorder = "border-violet-500/35 bg-violet-950/20";
                  }
                  if (log.agent_name.includes("Strategist")) {
                    borderCol = "border-amber-500/20 bg-amber-500/5";
                    avatarBorder = "border-amber-500/35 bg-amber-950/20";
                  }
                  if (log.agent_name.includes("Forecaster")) {
                    borderCol = "border-indigo-500/20 bg-indigo-500/5";
                    avatarBorder = "border-indigo-500/35 bg-indigo-950/20";
                  }
                  if (log.agent_name.includes("Planner")) {
                    borderCol = "border-rose-500/20 bg-rose-500/5";
                    avatarBorder = "border-rose-500/35 bg-rose-950/20";
                  }

                  return (
                    <div key={idx} className="flex gap-3 animate-fade-in">
                      <div className={`w-8 h-8 rounded-full border ${avatarBorder} flex items-center justify-center shrink-0`}>
                        {getAgentAvatar(log.agent_name)}
                      </div>
                      <div className={`p-3 rounded-2xl rounded-tl-none text-xs max-w-[85%] border ${borderCol} space-y-1.5 shadow-sm`}>
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-bold text-zinc-200 text-[11px]">{log.agent_name}</span>
                          <span className="text-[9px] text-zinc-500 font-mono">{log.timestamp}</span>
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500 block font-mono">
                          {log.role}
                        </span>
                        <div className="text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap">
                          {log.message}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Real-time Agent Typing Indicator */}
                {activeAgent && (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-violet-500/20 flex items-center justify-center shrink-0">
                      {getAgentAvatar(activeAgent)}
                    </div>
                    <div className="p-3 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl rounded-tl-none text-xs text-zinc-400 flex items-center gap-2 max-w-[60%] shadow-sm">
                      <span className="font-semibold text-zinc-300 font-mono text-[9px] uppercase tracking-wider">{activeAgent.split(" ")[0]} is writing</span>
                      <span className="flex gap-1 items-center py-1">
                        <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                  </div>
                )}

                <div ref={timelineEndRef} />
              </div>
              
              {/* Status bar */}
              {loading && (
                <div className="border-t border-zinc-800 p-3 bg-zinc-950/40 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
                  <span className="text-xs text-zinc-500 font-medium animate-pulse">
                    Agent team in conversation...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Draggable Resizer Handle */}
          <div 
            onMouseDown={startResizing}
            className="hidden lg:flex w-2 cursor-col-resize hover:bg-violet-500/20 active:bg-violet-500/50 items-center justify-center shrink-0 self-stretch group transition-colors duration-150 relative draggable-resizer no-print"
            title="Drag to resize Deliverables Brief"
          >
            <div className="w-[1px] h-full bg-zinc-800/80 group-hover:bg-violet-500" />
          </div>

          {/* Right Column: Final Deliverables (Insights & Charts) */}
          <div 
            ref={deliverablesRef}
            style={{ width: `${deliverablesWidth}px` }}
            className="print-report-container space-y-4 shrink-0 flex flex-col min-w-[320px] max-w-full"
          >
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 no-print">
              Deliverables brief
            </h3>

            {!analysisResult && loading && (
              <div className="border border-zinc-800 bg-zinc-900/10 p-6 rounded-xl text-center flex flex-col items-center justify-center h-[400px] no-print">
                <Cpu className="w-8 h-8 text-zinc-600 animate-pulse mb-3" />
                <span className="text-xs text-zinc-500">Awaiting agent team output summary...</span>
              </div>
            )}

            {error && (
              <div className="border border-red-500/20 bg-red-950/10 p-5 rounded-xl text-center text-red-400 text-xs no-print">
                <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-red-500" />
                <span className="font-bold block mb-1">Collaboration Aborted</span>
                <p>{error}</p>
              </div>
            )}

            {analysisResult && !loading && (
              <div className="space-y-4">
                
                {/* Actions Toolbar */}
                <div className="flex items-center justify-between gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl no-print">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-400" /> Export & Actions
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportToCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] rounded-lg transition"
                      title="Download active dataset as CSV"
                    >
                      <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] rounded-lg transition"
                      title="Export report as PDF via Print"
                    >
                      <Printer className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={handlePinToggle}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg transition ${
                        isPinned 
                          ? "bg-violet-600 hover:bg-violet-500 text-white" 
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                      }`}
                      title={isPinned ? "Remove insight from Pinboard" : "Pin insight to Pinboard"}
                    >
                      {isPinned ? <PinOff className="w-3.5 h-3.5 text-zinc-300" /> : <Pin className="w-3.5 h-3.5" />}
                      {isPinned ? "Pinned" : "Pin"}
                    </button>
                  </div>
                </div>

                {/* Executive Summary Brief */}
                <div className="glass-card p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-2.5">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> EXECUTIVE STRATEGIC BRIEF
                  </h4>
                  <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {analysisResult.answer}
                  </div>
                </div>

                {/* Dynamic Visualization output */}
                {analysisResult.chart_type !== "NONE" && (
                  <div className="glass-card p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-4">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      VISUALIZATION: {analysisResult.chart_type} CHART
                    </h4>
                    <div className="h-48 w-full text-xs">
                      {renderRecharts()}
                    </div>
                  </div>
                )}

                {/* Collapsible SQL container */}
                {analysisResult.sql && (
                  <div className="border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/60 shadow-sm">
                    <button 
                      onClick={() => setSqlExpanded(!sqlExpanded)}
                      className="w-full flex items-center justify-between px-3.5 py-2 bg-zinc-950/40 text-zinc-400 hover:text-zinc-200 text-xs font-mono font-semibold"
                    >
                      <span className="flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 text-violet-400" /> COMPILED SQL
                      </span>
                      {sqlExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    
                    {sqlExpanded && (
                      <div className="relative group">
                        <pre className="p-3 text-[10px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-32 border-t border-zinc-900 bg-zinc-950/80 leading-normal">
                          {analysisResult.sql}
                        </pre>
                        <button
                          onClick={() => copyToClipboard(analysisResult.sql)}
                          className="absolute right-2 top-2 p-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded opacity-0 group-hover:opacity-100 transition duration-150"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible Table drawer */}
                {analysisResult.data && analysisResult.data.length > 0 && (
                  <div className="border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/60 shadow-sm">
                    <button 
                      onClick={() => setTableExpanded(!tableExpanded)}
                      className="w-full flex items-center justify-between px-3.5 py-2 bg-zinc-950/40 text-zinc-400 hover:text-zinc-200 text-xs font-semibold"
                    >
                      <span className="flex items-center gap-1.5">
                        <Table className="w-3.5 h-3.5 text-blue-400" /> DATA TABLE ({analysisResult.data.length} rows)
                      </span>
                      {tableExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {tableExpanded && (
                      <div className="overflow-x-auto border-t border-zinc-900 max-h-40 text-[9px] font-mono">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-850">
                              {Object.keys(analysisResult.data[0]).map((key) => (
                                <th key={key} className="p-2 border-r border-zinc-850/50 truncate max-w-[100px] font-bold">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {analysisResult.data.slice(0, 15).map((row, idx) => (
                              <tr key={idx} className="border-b border-zinc-850 hover:bg-zinc-900/60 text-zinc-300">
                                {Object.values(row).map((val: any, vIdx) => (
                                  <td key={vIdx} className="p-2 border-r border-zinc-850/50 truncate max-w-[100px]">
                                    {val === null || val === undefined ? "null" : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}

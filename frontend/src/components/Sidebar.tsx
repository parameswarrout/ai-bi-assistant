import React, { useState, useEffect } from "react";
import { BarChart3, Database, MessageSquareCode, Settings, ShieldCheck, Terminal, User, Cpu, Plus, Trash2, MessageSquare } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isChatOpen, 
  setIsChatOpen,
  activeSessionId,
  setActiveSessionId
}: SidebarProps) {
  const [preferOllama, setPreferOllama] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [modelName, setModelName] = useState("qwen2.5:3b");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchOllamaStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ollama/status`);
      if (res.ok) {
        const data = await res.json();
        setIsRunning(data.running);
        setPreferOllama(data.prefer_ollama);
        if (data.model) setModelName(data.model);
        return data.running;
      }
    } catch (err) {
      console.error("Error fetching Ollama status:", err);
    }
    return false;
  };

  useEffect(() => {
    fetchOllamaStatus();
    // Poll status occasionally to keep in sync
    const interval = setInterval(fetchOllamaStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchAvailableModels = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ollama/models`);
      if (res.ok) {
        const data = await res.json();
        setAvailableModels(data.models || []);
      }
    } catch (err) {
      console.error("Error fetching available Ollama models:", err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  };

  useEffect(() => {
    if (isRunning) {
      fetchAvailableModels();
    } else {
      setAvailableModels([]);
    }
  }, [isRunning]);

  useEffect(() => {
    fetchSessions();
  }, [activeSessionId]);

  const handleToggle = async (checked: boolean) => {
    setPreferOllama(checked);
    try {
      // 1. Tell backend preference
      await fetch(`${API_BASE_URL}/api/ollama/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefer_ollama: checked }),
      });

      // 2. If turning ON and not currently running, trigger start & poll
      if (checked && !isRunning) {
        setIsPending(true);
        await fetch(`${API_BASE_URL}/api/ollama/start`, { method: "POST" });
        
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const active = await fetchOllamaStatus();
          if (active || attempts >= 12) {
            clearInterval(poll);
            setIsPending(false);
          }
        }, 1500);
      }
    } catch (err) {
      console.error("Failed to toggle Ollama:", err);
      setIsPending(false);
    }
  };

  const handleModelChange = async (model: string) => {
    setModelName(model);
    try {
      await fetch(`${API_BASE_URL}/api/ollama/select_model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: model }),
      });
    } catch (err) {
      console.error("Error selecting Ollama model:", err);
    }
  };

  const handleCreateSession = () => {
    const newId = `session-${Date.now()}`;
    setActiveSessionId(newId);
    setIsChatOpen(true);
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/sessions/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchSessions();
        if (activeSessionId === id) {
          setActiveSessionId(null);
        }
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "reports", label: "Database Explorer", icon: Database },
  ];

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between shrink-0 h-full">
      {/* Top Section */}
      <div className="flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-800 bg-zinc-950/40">
          <div className="p-2 bg-violet-600/10 rounded-lg border border-violet-500/20 text-violet-400">
            <MessageSquareCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-zinc-100">BI Assistant</h1>
            <p className="text-[10px] text-zinc-500 font-medium">Enterprise PoC</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">
            Analytics
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-violet-600/15 border-l-2 border-violet-500 text-violet-200"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-violet-400" : "text-zinc-400"}`} />
                {item.label}
              </button>
            );
          })}

          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-3 pt-6 mb-2 flex items-center justify-between">
            <span>Saved Chats</span>
            <button
              onClick={handleCreateSession}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded hover:bg-zinc-800 transition"
              title="New Session"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="max-h-40 overflow-y-auto px-2 space-y-1 scrollbar-thin">
            {sessions.map((sess) => {
              const isSelected = activeSessionId === sess.session_id;
              return (
                <div
                  key={sess.session_id}
                  onClick={() => {
                    setActiveSessionId(sess.session_id);
                    setIsChatOpen(true);
                  }}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                    isSelected
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{sess.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, sess.session_id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-0.5 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            {sessions.length === 0 && (
              <div className="text-[10px] text-zinc-650 italic px-3 py-1">
                No saved sessions
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Bottom Profile and Status */}
      <div className="p-4 border-t border-zinc-800 space-y-3">
        {/* Ollama Toggle Card */}
        <div className="p-3 bg-zinc-950/40 border border-zinc-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPending ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-spin inline-block w-2.5 h-2.5 border border-violet-500 border-t-transparent rounded-full"></span>
                </span>
              ) : isRunning ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
              ) : (
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-650 border border-zinc-500/20"></span>
                </span>
              )}
              <span className="text-xs font-semibold text-zinc-300">Local Model</span>
            </div>
            
            {/* Toggle Button */}
            <button
              onClick={() => handleToggle(!preferOllama)}
              disabled={isPending}
              className={`w-9 h-5 rounded-full relative transition-colors duration-200 focus:outline-none ${
                preferOllama ? "bg-violet-600" : "bg-zinc-800 border border-zinc-700"
              } ${isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`absolute top-[2px] left-[2px] bg-zinc-100 w-3.5 h-3.5 rounded-full transition-transform duration-200 ${
                  preferOllama ? "transform translate-x-4 bg-white" : ""
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-zinc-500" /> {modelName}
            </span>
            <span className={isPending ? "text-violet-400" : isRunning ? "text-emerald-400" : "text-zinc-500"}>
              {isPending ? "Starting..." : isRunning ? "Ollama Active" : "Ollama Offline"}
            </span>
          </div>

          {/* Model Selector Dropdown */}
          {isRunning && availableModels.length > 0 && (
            <div className="space-y-1 pt-1.5 border-t border-zinc-800/40">
              <select
                value={modelName}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded p-1 focus:outline-none focus:border-violet-500 transition font-mono"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-between p-2.5 bg-zinc-950/40 border border-zinc-800/60 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-zinc-400">SQLite Connected</span>
          </div>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold border border-zinc-700">
            <User className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-200 truncate">Parameswar</p>
            <p className="text-[10px] text-zinc-500 truncate">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

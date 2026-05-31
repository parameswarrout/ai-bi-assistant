"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import Explorer from "@/components/Explorer";
import AgentWorkspace from "@/components/AgentWorkspace";
import PinsGallery from "@/components/PinsGallery";
import { MessageSquareCode, Sparkles, Database, BarChart3, AlertCircle, Palette, Pin } from "lucide-react";
import ChatPanel from "@/components/ChatPanel";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  sql?: string;
  data?: Array<Record<string, any>>;
  loading?: boolean;
  error?: string;
  model_used?: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // Theme and Pinned Insights state hooks
  const [theme, setTheme] = useState("midnight");
  const [pinnedInsights, setPinnedInsights] = useState<any[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme");
    if (savedTheme) setTheme(savedTheme);

    const savedPins = localStorage.getItem("pinned_insights");
    if (savedPins) {
      try {
        setPinnedInsights(JSON.parse(savedPins));
      } catch (err) {
        console.error("Error loading pinned insights:", err);
      }
    }
  }, []);

  const handleSetTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("app_theme", newTheme);
  };

  const togglePinInsight = (insight: any) => {
    setPinnedInsights(prev => {
      const exists = prev.some(p => p.sql === insight.sql && p.answer === insight.answer);
      let updated;
      if (exists) {
        updated = prev.filter(p => !(p.sql === insight.sql && p.answer === insight.answer));
      } else {
        const newPin = {
          ...insight,
          id: `pin-${Date.now()}`,
          pinnedAt: new Date().toLocaleString()
        };
        updated = [...prev, newPin];
      }
      localStorage.setItem("pinned_insights", JSON.stringify(updated));
      return updated;
    });
  };

  // Dashboard filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [region, setRegion] = useState("");
  
  // Dashboard data states
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Chat message history
  const [messages, setMessages] = useState<Message[]>([]);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Fetch Dashboard Data with active filters
  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (region && region !== "All") params.append("region", region);

      const response = await fetch(`${API_BASE_URL}/api/dashboard?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Server returned code ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setDashboardError(
        err.message || "Failed to establish connection with FastAPI backend. Ensure backend is running."
      );
    } finally {
      setDashboardLoading(false);
    }
  };

  // Fetch Dashboard data on filter updates
  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, region]);

  // Load chat session history when activeSessionId changes
  useEffect(() => {
    const fetchSessionHistory = async () => {
      if (!activeSessionId) {
        setMessages([]);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${activeSessionId}`);
        if (response.ok) {
          const data = await response.json();
          const formatted = data.map((msg: any) => ({
            id: `msg-${msg.message_id}`,
            sender: msg.sender,
            text: msg.text,
            sql: msg.sql || undefined,
            data: msg.data || [],
            model_used: msg.model_used || undefined,
            loading: false
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.error("Error fetching session messages:", err);
      }
    };
    fetchSessionHistory();
  }, [activeSessionId]);

  // Keyboard shortcut Ctrl+K to toggle chat panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsChatOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Submit question to chat panel
  const handleSendMessage = async (text: string) => {
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      currentSessionId = `session-${Date.now()}`;
      setActiveSessionId(currentSessionId);
    }

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    // Add user message to UI
    const newUserMsg: Message = {
      id: userMessageId,
      sender: "user",
      text: text
    };
    
    // Add temporary loading assistant message
    const newAssistantMsg: Message = {
      id: assistantMessageId,
      sender: "assistant",
      text: "",
      loading: true
    };

    setMessages(prev => [...prev, newUserMsg, newAssistantMsg]);
    setIsChatOpen(true); // Always open chat on query submit

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: text, 
          session_id: currentSessionId,
          start_date: startDate || null,
          end_date: endDate || null,
          region: (region && region !== "All") ? region : null
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const responseData = await response.json();

      setMessages(prev => 
        prev.map(msg => {
          if (msg.id === assistantMessageId) {
            return {
              id: assistantMessageId,
              sender: "assistant",
              text: responseData.answer || "Query executed, but no explanation was returned.",
              sql: responseData.sql || undefined,
              data: responseData.data || [],
              loading: false,
              error: responseData.error || undefined,
              model_used: responseData.model_used || undefined
            };
          }
          return msg;
        })
      );

      // If query succeeded, refresh dashboard statistics in background
      if (!responseData.error) {
        fetchDashboardData();
      }

    } catch (err: any) {
      console.error("Chat message error:", err);
      setMessages(prev => 
        prev.map(msg => {
          if (msg.id === assistantMessageId) {
            return {
              id: assistantMessageId,
              sender: "assistant",
              text: "Could not retrieve analytical summary from server.",
              loading: false,
              error: err.message || "Failed to make REST request."
            };
          }
          return msg;
        })
      );
    }
  };

  const handleAskQuestionFromDashboard = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans theme-${theme} ${theme === "glassmorphism" ? "bg-zinc-950/80" : "bg-zinc-950"}`}>
      {/* Left Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isChatOpen={isChatOpen} 
        setIsChatOpen={setIsChatOpen}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Navbar */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-6 shrink-0 z-10 no-print">
          <div className="flex items-center gap-3">
            {activeTab === "dashboard" ? (
              <BarChart3 className="w-5 h-5 text-violet-400" />
            ) : activeTab === "reports" ? (
              <Database className="w-5 h-5 text-violet-400" />
            ) : activeTab === "pins" ? (
              <Pin className="w-5 h-5 text-violet-400" />
            ) : (
              <MessageSquareCode className="w-5 h-5 text-violet-400" />
            )}
            <h2 className="text-sm font-bold tracking-tight text-zinc-200">
              {activeTab === "dashboard" 
                ? "Interactive Dashboard" 
                : activeTab === "reports" 
                ? "Database Explorer & Audit" 
                : activeTab === "pins"
                ? "Saved Insights Gallery"
                : "Multi-Agent Analyst Workspace"}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Selector Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 transition duration-150">
                <Palette className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                <span>Theme: {theme === "glassmorphism" ? "Glassmorphism" : theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
              </button>
              <div className="absolute right-0 mt-1 w-44 bg-zinc-900 border border-zinc-805 rounded-xl shadow-xl py-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-150 z-50">
                {[
                  { id: "midnight", label: "Midnight Velvet", color: "bg-violet-500" },
                  { id: "emerald", label: "Emerald Oasis", color: "bg-emerald-500" },
                  { id: "cyberpunk", label: "Cyberpunk Neon", color: "bg-pink-500" },
                  { id: "glassmorphism", label: "Glassmorphism Frost", color: "bg-sky-400" }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSetTheme(t.id)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100 transition duration-100"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                      {t.label}
                    </span>
                    {theme === t.id && <span className="text-[10px] font-bold text-violet-400">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Ask Copilot Button if Chat is Closed */}
            {!isChatOpen && (
              <button
                onClick={() => setIsChatOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/25 text-violet-300 rounded-lg text-xs font-semibold tracking-wide transition duration-150"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask Copilot
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex min-h-0 relative">
          {activeTab === "dashboard" ? (
            <Dashboard 
              data={dashboardData} 
              loading={dashboardLoading} 
              error={dashboardError} 
              onAskQuestion={handleAskQuestionFromDashboard}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              region={region}
              setRegion={setRegion}
            />
          ) : activeTab === "reports" ? (
            <Explorer apiBaseUrl={API_BASE_URL} />
          ) : activeTab === "pins" ? (
            <PinsGallery pinnedInsights={pinnedInsights} onUnpin={(id) => setPinnedInsights(prev => {
              const updated = prev.filter(p => p.id !== id);
              localStorage.setItem("pinned_insights", JSON.stringify(updated));
              return updated;
            })} />
          ) : (
            <AgentWorkspace 
              apiBaseUrl={API_BASE_URL} 
              pinnedInsights={pinnedInsights}
              onTogglePin={togglePinInsight}
            />
          )}
        </div>
      </div>

      {/* Right AI Copilot Panel */}
      <ChatPanel 
        messages={messages} 
        onSendMessage={handleSendMessage} 
        isOpen={isChatOpen} 
        setIsOpen={setIsChatOpen} 
        activeSessionId={activeSessionId}
        setMessages={setMessages}
      />
    </div>
  );
}

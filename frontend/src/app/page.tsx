"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import Explorer from "@/components/Explorer";
import ChatPanel from "@/components/ChatPanel";
import { MessageSquareCode, Sparkles, Database, BarChart3, AlertCircle } from "lucide-react";

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
  
  // Dashboard states
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Chat message history
  const [messages, setMessages] = useState<Message[]>([]);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard`);
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    // Add user message
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
        body: JSON.stringify({ message: text }),
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

      // If query succeeded, refresh dashboard statistics in background to reflect dynamic updates
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
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Left Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isChatOpen={isChatOpen} 
        setIsChatOpen={setIsChatOpen} 
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Navbar */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-6 shrink-0 z-0">
          <div className="flex items-center gap-3">
            {activeTab === "dashboard" ? (
              <BarChart3 className="w-5 h-5 text-violet-400" />
            ) : (
              <Database className="w-5 h-5 text-violet-400" />
            )}
            <h2 className="text-sm font-bold tracking-tight text-zinc-200">
              {activeTab === "dashboard" ? "Interactive Dashboard" : "Database Explorer & Audit"}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
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
            />
          ) : (
            <Explorer apiBaseUrl={API_BASE_URL} />
          )}
        </div>
      </div>

      {/* Right AI Copilot Panel */}
      <ChatPanel 
        messages={messages} 
        onSendMessage={handleSendMessage} 
        isOpen={isChatOpen} 
        setIsOpen={setIsChatOpen} 
      />
    </div>
  );
}

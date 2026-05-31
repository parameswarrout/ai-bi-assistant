"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  User, 
  Send, 
  Code, 
  Table, 
  Copy, 
  Check, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  HelpCircle,
  Edit2,
  Play,
  Download,
  Loader2,
  Mic
} from "lucide-react";

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

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeSessionId: string | null;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const SUGGESTED_PROMPTS = [
  "Top 10 customers by revenue",
  "Revenue by month",
  "Best selling products",
  "Which category is declining?",
  "Compare sales between North and South regions",
  "Which region generated the highest revenue last quarter?"
];

export default function ChatPanel({ 
  messages, 
  onSendMessage, 
  isOpen, 
  setIsOpen,
  activeSessionId,
  setMessages
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSqlIds, setExpandedSqlIds] = useState<Record<string, boolean>>({});
  const [expandedTableIds, setExpandedTableIds] = useState<Record<string, boolean>>({});
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Custom SQL Console states
  const [editingSqlId, setEditingSqlId] = useState<string | null>(null);
  const [editedSqlText, setEditedSqlText] = useState("");
  const [isRerunning, setIsRerunning] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Resizing logic for Chat Panel
  const [width, setWidth] = useState(480); // Default to larger 480px
  const isResizing = useRef(false);
  const startWidthRef = useRef<number>(480);
  const startXRef = useRef<number>(0);

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    isResizing.current = true;
    startWidthRef.current = width;
    startXRef.current = mouseDownEvent.clientX;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
    if (!isResizing.current) return;
    const deltaX = mouseMoveEvent.clientX - startXRef.current;
    const newWidth = startWidthRef.current - deltaX;
    if (newWidth >= 320 && newWidth <= 850) {
      setWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [width]);

  const lastAiMsg = [...messages].reverse().find(m => m.sender === "assistant" && m.model_used);
  const activeEngineLabel = lastAiMsg?.model_used || "Bedrock Claude Sonnet / Ollama";

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSql = (id: string) => {
    setExpandedSqlIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTable = (id: string) => {
    setExpandedTableIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRerunSql = async (messageId: string, originalQuestion: string) => {
    setIsRerunning(messageId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/run_sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSessionId || "",
          sql: editedSqlText,
          question: originalQuestion
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Database query failed");
      }

      const responseData = await response.json();

      setMessages((prev: Message[]) =>
        prev.map((m) => {
          if (m.id === messageId) {
            return {
              ...m,
              text: responseData.answer,
              sql: responseData.sql,
              data: responseData.data || [],
              error: undefined,
              model_used: responseData.model_used
            };
          }
          return m;
        })
      );
      setEditingSqlId(null);
    } catch (err: any) {
      console.error(err);
      alert(`SQL Execution Error: ${err.message}`);
    } finally {
      setIsRerunning(null);
    }
  };

  const handleExportCsv = (tableName: string, data: any[]) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Header row
    csvRows.push(headers.join(","));
    
    // Data rows
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ("" + (val === null || val === undefined ? "" : val)).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${tableName}_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div style={{ width: `${width}px` }} className="bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 h-full shadow-2xl relative z-10 glass-panel">
      {/* Draggable Resizer Handle on Left Border */}
      <div 
        onMouseDown={startResizing}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-violet-500/20 active:bg-violet-500/50 flex items-center justify-center shrink-0 h-full z-25 group transition-all duration-150"
        title="Drag to resize Chat Panel"
      >
        <div className="w-[1px] h-full bg-zinc-850/80 group-hover:bg-violet-500" />
      </div>
      {/* Header */}
      <div className="h-16 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-600/20 text-violet-400 rounded border border-violet-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-100">AI SQL Copilot</h3>
            <p className="text-[10px] text-zinc-400">Engine: {activeEngineLabel}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 transition"
        >
          Close
        </button>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto w-12 h-12 bg-violet-600/10 text-violet-400 border border-violet-500/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-zinc-200">Welcome to BI Chat Assistant</h4>
              <p className="text-xs text-zinc-400 max-w-[300px] mx-auto leading-relaxed">
                Ask business questions in natural language. I'll translate your query to SQLite, run it, and present the findings.
              </p>
            </div>

            {/* Suggestions */}
            <div className="pt-4 space-y-2 text-left max-w-sm mx-auto">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1">Suggested Analysis</span>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => onSendMessage(prompt)}
                    className="text-left text-xs bg-zinc-950/40 border border-zinc-800/80 hover:border-violet-500/35 hover:bg-zinc-850 p-2.5 rounded-lg text-zinc-300 transition-all truncate"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isAI = msg.sender === "assistant";
            const sqlExpanded = expandedSqlIds[msg.id] ?? true;
            const tableExpanded = expandedTableIds[msg.id] ?? false;

            return (
              <div key={msg.id} className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full border shrink-0 flex items-center justify-center ${
                  isAI 
                    ? "bg-violet-600/15 border-violet-500/30 text-violet-400" 
                    : "bg-zinc-800 border-zinc-700 text-zinc-300"
                }`}>
                  {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Body */}
                <div className={`space-y-2 max-w-[85%] ${isAI ? "" : "bg-violet-600/15 border border-violet-500/20 text-zinc-200 p-3 rounded-2xl rounded-tr-none"}`}>
                  
                  {/* User message text */}
                  {!isAI && <p className="text-sm leading-relaxed">{msg.text}</p>}

                  {/* AI response details */}
                  {isAI && (
                    <div className="space-y-3">
                      {/* Loading status */}
                      {msg.loading && (
                        <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-850 rounded-lg">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                          </span>
                          <span className="text-xs text-zinc-400 font-medium animate-pulse">AI is writing SQL & analyzing...</span>
                        </div>
                      )}

                      {/* Error State */}
                      {msg.error && (
                        <div className="flex gap-2 p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 text-xs">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Execution Error</span>
                            {msg.text}
                          </div>
                        </div>
                      )}

                      {/* Valid AI Explanation */}
                      {!msg.loading && !msg.error && (
                        <div className="bg-zinc-850 border border-zinc-800/80 p-3 rounded-2xl rounded-tl-none text-zinc-200 text-sm space-y-2 shadow-sm leading-relaxed">
                          <div>{msg.text}</div>
                          {msg.model_used && (
                            <div className="text-[10px] text-zinc-500 pt-1.5 mt-1 border-t border-zinc-800/60 flex items-center gap-1 font-mono">
                              <Sparkles className="w-2.5 h-2.5 text-violet-400" />
                              <span>Answered by {msg.model_used}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Generated SQL Section */}
                      {msg.sql && (
                        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
                          <button 
                            onClick={() => toggleSql(msg.id)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-zinc-950/40 text-zinc-400 hover:text-zinc-200 text-xs font-mono font-semibold"
                          >
                            <span className="flex items-center gap-1.5">
                              <Code className="w-3.5 h-3.5 text-violet-400" /> GENERATED SQL
                            </span>
                            {sqlExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          
                          {sqlExpanded && (
                            <div className="relative group">
                              {editingSqlId === msg.id ? (
                                <div className="p-3 space-y-2 bg-zinc-950/80 border-t border-zinc-900">
                                  <textarea
                                    value={editedSqlText}
                                    onChange={(e) => setEditedSqlText(e.target.value)}
                                    rows={4}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded p-2 text-[11px] font-mono text-zinc-200 outline-none resize-y"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => setEditingSqlId(null)}
                                      disabled={isRerunning === msg.id}
                                      className="px-2.5 py-1 text-[10px] bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded font-semibold transition"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => {
                                        const msgIndex = messages.findIndex(m => m.id === msg.id);
                                        const userMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;
                                        handleRerunSql(msg.id, userMsg?.text || "custom query");
                                      }}
                                      disabled={isRerunning === msg.id}
                                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-850 text-white rounded font-semibold transition"
                                    >
                                      {isRerunning === msg.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Play className="w-3 h-3" />
                                      )}
                                      Run Query
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <pre className="p-3 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 border-t border-zinc-900 bg-zinc-950/80">
                                    {msg.sql}
                                  </pre>
                                  <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-155">
                                    <button
                                      onClick={() => {
                                        setEditingSqlId(msg.id);
                                        setEditedSqlText(msg.sql || "");
                                      }}
                                      className="p-1 rounded bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-200"
                                      title="Edit SQL"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(msg.sql || "", msg.id)}
                                      className="p-1 rounded bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-200"
                                      title="Copy SQL"
                                    >
                                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* SQL Result Table Section */}
                      {msg.data && msg.data.length > 0 && (
                        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
                          <div 
                            onClick={() => toggleTable(msg.id)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-zinc-950/40 text-zinc-400 hover:text-zinc-200 text-xs font-semibold cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Table className="w-3.5 h-3.5 text-blue-400" /> RESULTS TABLE ({msg.data.length} rows)
                            </span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleExportCsv("chat_query", msg.data || []); }}
                              className="ml-auto mr-3 flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 px-2 py-0.5 rounded transition cursor-pointer"
                            >
                              <Download className="w-3 h-3 text-violet-400" /> Export CSV
                            </button>
                            {tableExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>

                          {tableExpanded && (
                            <div className="overflow-x-auto border-t border-zinc-900 max-h-60 text-[10px] font-mono">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                                    {Object.keys(msg.data[0]).map((key) => (
                                      <th key={key} className="p-2 border-r border-zinc-800/40 truncate max-w-[120px] font-bold">
                                        {key}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {msg.data.slice(0, 50).map((row, idx) => (
                                    <tr key={idx} className="border-b border-zinc-850 hover:bg-zinc-900/60 text-zinc-300">
                                      {Object.values(row).map((val: any, vIdx) => (
                                        <td key={vIdx} className="p-2 border-r border-zinc-800/40 truncate max-w-[120px]">
                                          {val === null || val === undefined ? "NULL" : String(val)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {msg.data.length > 50 && (
                                <div className="p-2 bg-zinc-900/40 text-center text-zinc-500 font-sans border-t border-zinc-800">
                                  Showing top 50 records.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Empty dataset message */}
                      {msg.data && msg.data.length === 0 && !msg.loading && !msg.error && (
                        <div className="p-2.5 bg-zinc-900/45 border border-zinc-800/70 rounded-lg text-zinc-500 text-[11px] italic flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                          Query completed successfully, but returned 0 rows.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800 shrink-0 bg-zinc-950/20">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question about sales, regions, products..."
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl pl-3 pr-10 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none transition"
            />
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`absolute right-3 p-1 rounded-lg transition duration-150 hover:bg-zinc-850 ${
                isRecording ? "text-red-500 animate-pulse" : "text-zinc-400 hover:text-zinc-200"
              }`}
              title={isRecording ? "Stop voice input" : "Start voice input (microphone)"}
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl disabled:bg-zinc-800 disabled:text-zinc-500 transition duration-150 shrink-0 flex items-center justify-center shadow-lg shadow-violet-600/10"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-zinc-500 text-center mt-2">
          Only read operations are executed. Database remains safe.
        </p>
      </form>
    </div>
  );
}

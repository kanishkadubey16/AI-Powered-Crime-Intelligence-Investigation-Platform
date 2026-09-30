import { useState, useRef, useEffect, useCallback } from "react";
import {
  RiRobot2Line, RiDeleteBin6Line, RiBookOpenLine,
  RiShieldCheckLine, RiScales3Line, RiFileTextLine,
} from "react-icons/ri";
import toast from "react-hot-toast";
import ChatMessage from "../components/ai/ChatMessage";
import ChatInput from "../components/ai/ChatInput";
import { aiService } from "../services/aiService";

// ── Constants ────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE = {
  role: "assistant",
  content: "Hello! I'm Rakshak AI Legal Assistant.\n\nI can answer questions grounded in **BNS 2023**, **BNSS 2023**, **Constitution of India**, **Indian Evidence Act**, and the **Police Manual**.\n\nAsk me anything about applicable sections, arrest powers, bail provisions, or investigation procedures.",
  sources: [],
  timestamp: new Date().toISOString(),
};

const SUGGESTIONS = [
  { icon: RiScales3Line,     label: "Murder sections",       question: "What sections apply to murder under BNS 2023?" },
  { icon: RiShieldCheckLine, label: "Arrest without warrant", question: "Can police arrest without a warrant? Under what conditions?" },
  { icon: RiFileTextLine,    label: "Cyber fraud punishment", question: "What is the punishment for cyber fraud under BNS?" },
  { icon: RiBookOpenLine,    label: "Bail provisions",        question: "What are the bail provisions for non-bailable offences under BNSS?" },
  { icon: RiScales3Line,     label: "Evidence admissibility", question: "What types of evidence are admissible in Indian courts?" },
  { icon: RiShieldCheckLine, label: "FIR procedure",          question: "What is the procedure for filing an FIR under BNSS?" },
];

const STORAGE_KEY = "rakshak_legal_chat_history";

// ── Helpers ──────────────────────────────────────────────────────────────────

const loadHistory = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [WELCOME_MESSAGE];
  } catch {
    return [WELCOME_MESSAGE];
  }
};

const saveHistory = (messages) => {
  try {
    // Keep last 50 messages to avoid storage bloat
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  } catch { /* ignore quota errors */ }
};

// ── Component ────────────────────────────────────────────────────────────────

const AIAssistant = () => {
  const [messages, setMessages]   = useState(loadHistory);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const bottomRef                 = useRef(null);

  // Persist history to sessionStorage on every change
  useEffect(() => { saveHistory(messages); }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { ...msg, timestamp: new Date().toISOString() }]);
  }, []);

  const handleSend = useCallback(async (question) => {
    if (loading) return;
    setError(null);

    addMessage({ role: "user", content: question });
    setLoading(true);

    try {
      const { data } = await aiService.legalQuery(question);

      addMessage({
        role: "assistant",
        content: data.answer,
        sources: data.sources ?? [],
      });
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      let msg = "Something went wrong. Please try again.";
      
      if (backendMessage) {
        msg = backendMessage;
      } else if (err.code === "ERR_NETWORK") {
        msg = "The RAG service is currently offline. Please ensure the ML service is running.";
      }

      setError(msg);
      addMessage({ role: "assistant", content: msg, sources: [], isError: true });
      toast.error("Request failed");
    } finally {
      setLoading(false);
    }
  }, [loading, addMessage]);

  const handleClear = () => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date().toISOString() }]);
    setError(null);
    toast.success("Conversation cleared");
  };

  const messageCount = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex flex-col h-full -m-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <RiRobot2Line size={18} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-100">Legal AI Assistant</h1>
            <p className="text-xs text-slate-500">Grounded in BNS · BNSS · Constitution · Evidence Act</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {messageCount > 0 && (
            <span className="text-xs text-slate-500 hidden sm:block">
              {messageCount} question{messageCount !== 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={handleClear}
            title="Clear conversation"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-500/10"
          >
            <RiDeleteBin6Line size={14} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Chat column */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3 fade-in">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm shrink-0 mt-0.5">
                  <RiRobot2Line />
                </div>
                <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-cyan-500/60 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                  <span className="text-xs text-slate-500 ml-1">Searching legal documents...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <ChatInput onSend={handleSend} loading={loading} />
        </div>

        {/* ── Sidebar ── */}
        <div className="hidden lg:flex flex-col w-64 xl:w-72 border-l border-slate-800 shrink-0 overflow-y-auto">

          {/* Suggestions */}
          <div className="p-4 border-b border-slate-800">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Suggested Questions
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map(({ icon: Icon, label, question }, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(question)}
                  disabled={loading}
                  className="w-full text-left flex items-center gap-2.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-700/50 border border-slate-700/40 hover:border-slate-600/60 rounded-lg px-3 py-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Icon size={13} className="text-cyan-500/70 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Document sources legend */}
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Legal Documents
            </p>
            <div className="space-y-2">
              {[
                { label: "BNS 2023",       color: "bg-blue-500",   desc: "Bharatiya Nyaya Sanhita" },
                { label: "BNSS 2023",      color: "bg-purple-500", desc: "Bharatiya Nagarik Suraksha Sanhita" },
                { label: "Constitution",   color: "bg-amber-500",  desc: "Constitution of India" },
                { label: "Evidence Act",   color: "bg-green-500",  desc: "Indian Evidence Act" },
                { label: "Police Manual",  color: "bg-rose-500",   desc: "Police Manual" },
              ].map(({ label, color, desc }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                  <div>
                    <p className="text-xs text-slate-300 font-medium leading-none">{label}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-none">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
              <p className="text-xs text-amber-400/80 leading-relaxed">
                Answers are grounded only in the uploaded legal documents. Always verify with a qualified legal professional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;

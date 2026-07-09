import { useState, useRef, useEffect } from "react";
import { RiRobot2Line } from "react-icons/ri";
import toast from "react-hot-toast";
import PageHeader from "../components/common/PageHeader";
import ChatMessage from "../components/ai/ChatMessage";
import ChatInput from "../components/ai/ChatInput";
import { aiService } from "../services/aiService";

const SUGGESTIONS = [
  "Summarize the latest open cases",
  "What are the relevant IPC sections for theft?",
  "Analyze patterns in cybercrime cases",
  "Generate a report for case #2024-001",
];

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm Rakshak AI, your crime intelligence assistant. I can help you analyze cases, search legal provisions, and generate reports. How can I assist you today?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (message) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);
    try {
      const { data } = await aiService.chat(message, sessionId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      toast.error("AI service unavailable");
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm unable to process your request right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full -m-6">
      <div className="px-6 pt-6 pb-4 border-b border-slate-800">
        <PageHeader
          title="AI Assistant"
          subtitle="Powered by Gemini & LangGraph RAG"
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm shrink-0">
                  <RiRobot2Line />
                </div>
                <div className="bg-slate-800 rounded-xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <ChatInput onSend={handleSend} loading={loading} />
        </div>

        {/* Suggestions panel */}
        <div className="hidden xl:flex flex-col w-64 border-l border-slate-800 p-4 shrink-0">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Suggestions</p>
          <div className="space-y-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="w-full text-left text-sm text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg px-3 py-2.5 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;

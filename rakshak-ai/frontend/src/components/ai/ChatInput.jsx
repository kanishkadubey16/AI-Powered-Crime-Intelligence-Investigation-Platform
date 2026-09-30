import { useState, useRef, useEffect } from "react";
import { RiSendPlaneLine } from "react-icons/ri";

const ChatInput = ({ onSend, loading }) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  // Auto-resize textarea up to 5 lines
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || loading) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-950/50 px-4 py-3">
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a legal question... (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={loading}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 transition-all resize-none leading-relaxed disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!value.trim() || loading}
          className="shrink-0 w-10 h-10 flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 rounded-xl transition-all"
        >
          <RiSendPlaneLine size={17} />
        </button>
      </form>
      <p className="text-xs text-slate-600 mt-1.5 px-1">
        Answers are grounded in BNS, BNSS, Constitution, Evidence Act &amp; Police Manual
      </p>
    </div>
  );
};

export default ChatInput;

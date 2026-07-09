import { useState } from "react";
import { RiSendPlaneLine } from "react-icons/ri";

const ChatInput = ({ onSend, loading }) => {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || loading) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 p-4 border-t border-slate-700">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask about a case, law, or evidence..."
        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={!value.trim() || loading}
        className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-lg transition-colors"
      >
        <RiSendPlaneLine size={18} />
      </button>
    </form>
  );
};

export default ChatInput;

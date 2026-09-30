import { useState } from "react";
import { RiRobot2Line, RiUserLine, RiBookOpenLine, RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";
import { cn } from "../../utils/cn";

const SOURCE_COLORS = {
  "BNS.pdf":          "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "BNSS.pdf":         "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Constitution.pdf": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Evidence.pdf":     "bg-green-500/10 text-green-400 border-green-500/20",
  "PoliceManual.pdf": "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const SOURCE_LABELS = {
  "BNS.pdf":          "BNS 2023",
  "BNSS.pdf":         "BNSS 2023",
  "Constitution.pdf": "Constitution",
  "Evidence.pdf":     "Evidence Act",
  "PoliceManual.pdf": "Police Manual",
};

// Render answer text — bold **text**, newlines, and bullet points
const FormattedText = ({ text }) => {
  if (!text) return null;
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // Bold: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j} className="text-slate-100 font-semibold">{part.slice(2, -2)}</strong>
            : part
        );
        const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("• ");
        return isBullet
          ? <div key={i} className="flex gap-2"><span className="text-cyan-500 mt-0.5 shrink-0">•</span><span>{rendered}</span></div>
          : <p key={i}>{rendered}</p>;
      })}
    </div>
  );
};

const ChatMessage = ({ message }) => {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isAI = message.role === "assistant";
  const hasSources = isAI && message.sources?.length > 0;
  const isError = message.isError;

  return (
    <div className={cn("flex gap-3 fade-in", isAI ? "flex-row" : "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm mt-0.5",
        isAI
          ? isError ? "bg-red-500/20 text-red-400" : "bg-cyan-500/20 text-cyan-400"
          : "bg-slate-700 text-slate-300"
      )}>
        {isAI ? <RiRobot2Line /> : <RiUserLine />}
      </div>

      {/* Bubble */}
      <div className={cn("flex flex-col gap-2", isAI ? "items-start max-w-[80%]" : "items-end max-w-[70%]")}>
        <div className={cn(
          "px-4 py-3 rounded-xl text-sm leading-relaxed",
          isAI
            ? isError
              ? "bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-none"
              : "bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-none"
            : "bg-cyan-500/10 border border-cyan-500/20 text-slate-200 rounded-tr-none"
        )}>
          <FormattedText text={message.content} />
        </div>

        {/* Sources toggle */}
        {hasSources && (
          <div className="w-full space-y-2">
            <button
              onClick={() => setSourcesOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <RiBookOpenLine size={12} />
              <span>Sources Referenced</span>
              {sourcesOpen ? <RiArrowUpSLine size={14} /> : <RiArrowDownSLine size={14} />}
            </button>

            {sourcesOpen && (
              <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg p-3 space-y-2 fade-in">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Retrieved from</p>
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((src, i) => {
                    const sourceName = src.source || src;
                    return (
                      <span
                        key={i}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium",
                          SOURCE_COLORS[sourceName] ?? "bg-slate-700/50 text-slate-400 border-slate-600/50"
                        )}
                      >
                        <RiBookOpenLine size={10} />
                        {SOURCE_LABELS[sourceName] ?? sourceName}
                        {src.page && <span className="opacity-70 ml-1">p.{src.page}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <span className="text-xs text-slate-600 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;

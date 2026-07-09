import { cn } from "../../utils/cn";
import { RiRobot2Line, RiUserLine } from "react-icons/ri";

const ChatMessage = ({ message }) => {
  const isAI = message.role === "assistant";

  return (
    <div className={cn("flex gap-3", isAI ? "flex-row" : "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm",
          isAI ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-700 text-slate-300"
        )}
      >
        {isAI ? <RiRobot2Line /> : <RiUserLine />}
      </div>
      <div
        className={cn(
          "max-w-[75%] px-4 py-3 rounded-xl text-sm leading-relaxed",
          isAI
            ? "bg-slate-800 text-slate-200 rounded-tl-none"
            : "bg-cyan-500/10 border border-cyan-500/20 text-slate-200 rounded-tr-none"
        )}
      >
        {message.content}
      </div>
    </div>
  );
};

export default ChatMessage;

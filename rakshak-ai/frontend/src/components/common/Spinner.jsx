import { cn } from "../../utils/cn";

const Spinner = ({ className }) => (
  <div className={cn("flex items-center justify-center w-full py-12", className)}>
    <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin" />
  </div>
);

export default Spinner;

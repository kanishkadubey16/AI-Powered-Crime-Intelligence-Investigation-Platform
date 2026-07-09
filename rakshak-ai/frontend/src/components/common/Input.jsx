import { forwardRef } from "react";
import { cn } from "../../utils/cn";

const Input = forwardRef(({ label, error, icon, className, ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-sm font-medium text-slate-300">{label}</label>
    )}
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500",
          "focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all",
          icon && "pl-10",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/30",
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
));

Input.displayName = "Input";
export default Input;

import { forwardRef } from "react";
import { cn } from "../../utils/cn";

const Select = forwardRef(({ label, error, options = [], className, ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
    <select
      ref={ref}
      className={cn(
        "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100",
        "focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all",
        error && "border-red-500",
        className
      )}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
));

Select.displayName = "Select";
export default Select;

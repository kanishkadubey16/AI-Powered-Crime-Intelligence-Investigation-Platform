import { cn } from "../../utils/cn";

const DashboardCard = ({ title, value, subtitle, icon, trend, trendUp, color = "cyan", className }) => {
  const colors = {
    cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    red: "text-red-400 bg-red-400/10 border-red-400/20",
    violet: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  };

  return (
    <div className={cn(
      "glass rounded-xl p-5 fade-in hover:border-slate-600/50 transition-all duration-300 group",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-black text-slate-100 mt-2 tabular-nums">
            {value ?? <span className="skeleton inline-block w-16 h-8 rounded" />}
          </p>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <p className={cn("text-xs font-semibold mt-2 flex items-center gap-1",
              trendUp ? "text-emerald-400" : "text-red-400"
            )}>
              <span>{trendUp ? "▲" : "▼"}</span> {trend}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn(
            "p-3 rounded-xl border text-xl transition-transform duration-300 group-hover:scale-110",
            colors[color]
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCard;

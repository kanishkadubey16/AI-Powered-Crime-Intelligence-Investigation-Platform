import { cn } from "../../utils/cn";

const variants = {
  primary: "bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold",
  secondary: "bg-slate-700 hover:bg-slate-600 text-slate-100",
  danger: "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30",
  ghost: "hover:bg-slate-700 text-slate-300",
  outline: "border border-slate-600 hover:border-slate-500 text-slate-300 hover:bg-slate-700",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
};

const Button = ({
  children,
  variant = "primary",
  size = "md",
  className,
  loading = false,
  icon,
  ...props
}) => (
  <button
    className={cn(
      "inline-flex items-center gap-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
      variants[variant],
      sizes[size],
      className
    )}
    disabled={loading || props.disabled}
    {...props}
  >
    {loading ? (
      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
    ) : (
      icon && <span className="text-base">{icon}</span>
    )}
    {children}
  </button>
);

export default Button;

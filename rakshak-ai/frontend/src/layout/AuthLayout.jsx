import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { RiShieldCheckLine, RiRadarLine, RiCpuLine, RiDatabase2Line } from "react-icons/ri";
import { APP_NAME } from "../constants";

const features = [
  { icon: <RiRadarLine />, label: "Real-time Case Tracking" },
  { icon: <RiCpuLine />, label: "AI-Powered Analysis" },
  { icon: <RiDatabase2Line />, label: "Secure Evidence Vault" },
];

const AuthLayout = () => {
  const { token } = useAuth();
  if (token) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden bg-slate-900 border-r border-slate-800/80 p-14">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow orb */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <RiShieldCheckLine className="text-slate-900 text-xl" />
          </div>
          <div>
            <p className="text-slate-100 font-bold text-base leading-none">{APP_NAME}</p>
            <p className="text-slate-500 text-xs mt-0.5">Law Enforcement Platform</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-cyan-400 text-xs font-medium">Powered by Gemini AI & LangGraph</span>
          </div>

          <h1 className="text-[2.6rem] font-black text-slate-100 leading-[1.15] tracking-tight">
            AI-Powered Crime
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
              Intelligence Platform
            </span>
          </h1>

          <p className="text-slate-400 mt-5 text-base leading-relaxed max-w-sm">
            Empowering law enforcement with intelligent case management, evidence analysis, and AI-driven investigative insights.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-3 mt-8">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 text-sm shrink-0">
                  {f.icon}
                </div>
                <span className="text-slate-300 text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between">
          <p className="text-slate-600 text-xs">© 2025 Rakshak AI. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-slate-500 text-xs">System Operational</span>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Mobile logo */}
        <div className="absolute top-6 left-6 flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
            <RiShieldCheckLine className="text-slate-900 text-base" />
          </div>
          <span className="text-slate-100 font-bold text-sm">{APP_NAME}</span>
        </div>

        <div className="w-full max-w-[420px] relative">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

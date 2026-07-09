import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  RiSearchLine,
  RiNotification3Line,
  RiMoonLine,
  RiAddLine,
} from "react-icons/ri";
import Button from "../common/Button";

const pageTitles = {
  "/": "Dashboard",
  "/cases": "Cases",
  "/upload-fir": "Upload FIR",
  "/evidence": "Evidence",
  "/analytics": "Analytics",
  "/ai-assistant": "AI Assistant",
  "/reports": "Reports",
  "/settings": "Settings",
};

const Topbar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const title = pageTitles[pathname] || "Rakshak AI";

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
      <h2 className="text-slate-100 font-semibold text-lg">{title}</h2>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cases, evidence..."
            className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64 transition-all"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<RiAddLine />}
          onClick={() => navigate("/upload-fir")}
        >
          New Case
        </Button>

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
          <RiNotification3Line size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
        </button>
      </div>
    </header>
  );
};

export default Topbar;

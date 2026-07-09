import { NavLink, useNavigate } from "react-router-dom";
import {
  RiDashboardLine,
  RiFolderLine,
  RiUploadCloud2Line,
  RiFileTextLine,
  RiBarChartLine,
  RiRobot2Line,
  RiFileListLine,
  RiSettings3Line,
  RiShieldLine,
  RiLogoutBoxLine,
} from "react-icons/ri";
import { cn } from "../../utils/cn";
import { useAuth } from "../../context/AuthContext";
import { APP_NAME } from "../../constants";

const navItems = [
  { label: "Dashboard", icon: <RiDashboardLine />, to: "/" },
  { label: "Cases", icon: <RiFolderLine />, to: "/cases" },
  { label: "Upload FIR", icon: <RiUploadCloud2Line />, to: "/upload-fir" },
  { label: "Evidence", icon: <RiFileTextLine />, to: "/evidence" },
  { label: "Analytics", icon: <RiBarChartLine />, to: "/analytics" },
  { label: "AI Assistant", icon: <RiRobot2Line />, to: "/ai-assistant" },
  { label: "Reports", icon: <RiFileListLine />, to: "/reports" },
];

const bottomItems = [
  { label: "Settings", icon: <RiSettings3Line />, to: "/settings" },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-64 shrink-0 h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
          <RiShieldLine className="text-slate-900 text-lg" />
        </div>
        <div>
          <p className="text-slate-100 font-bold text-sm leading-tight">{APP_NAME}</p>
          <p className="text-slate-500 text-xs">Intelligence Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 font-medium"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-slate-800 space-y-0.5">
        {bottomItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 font-medium"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-300 text-xs font-medium truncate">{user?.name || "Officer"}</p>
            <p className="text-slate-500 text-xs truncate">{user?.role || "User"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded"
            title="Logout"
          >
            <RiLogoutBoxLine size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

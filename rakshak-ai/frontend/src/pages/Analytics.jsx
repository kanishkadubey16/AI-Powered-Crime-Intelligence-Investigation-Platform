import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import PageHeader from "../components/common/PageHeader";
import DashboardCard from "../components/dashboard/DashboardCard";
import Spinner from "../components/common/Spinner";
import useApi from "../hooks/useApi";
import { analyticsService } from "../services/analyticsService";
import { RiFolderLine, RiCheckboxCircleLine, RiTimeLine, RiAlertLine } from "react-icons/ri";

const COLORS = ["#22d3ee", "#818cf8", "#34d399", "#fb923c", "#f87171"];

const Analytics = () => {
  const { data, loading } = useApi(analyticsService.getSummary);

  if (loading) return <Spinner />;

  const stats = data?.stats || {};
  const trends = data?.trends || [];
  const crimeTypes = data?.crimeTypes || [];
  const monthlyData = data?.monthly || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Crime intelligence insights and trends" />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardCard title="Total Cases" value={stats.totalCases ?? "—"} icon={<RiFolderLine />} />
        <DashboardCard title="Solved" value={stats.closedCases ?? "—"} icon={<RiCheckboxCircleLine />} />
        <DashboardCard title="Avg. Resolution" value={stats.avgResolutionDays ? `${stats.avgResolutionDays}d` : "—"} icon={<RiTimeLine />} />
        <DashboardCard title="Critical" value={stats.criticalAlerts ?? "—"} icon={<RiAlertLine />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-slate-100 font-semibold mb-5">Monthly Case Trends</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
              <Line type="monotone" dataKey="cases" stroke="#22d3ee" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="solved" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Crime types */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-slate-100 font-semibold mb-5">Crime Type Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={crimeTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={90} label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}>
                {crimeTypes.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 xl:col-span-2">
          <h3 className="text-slate-100 font-semibold mb-5">Cases by Priority</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="critical" fill="#f87171" radius={[4, 4, 0, 0]} />
              <Bar dataKey="high" fill="#fb923c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="medium" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              <Bar dataKey="low" fill="#64748b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

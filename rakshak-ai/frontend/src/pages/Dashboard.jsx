import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  RiFolderLine, RiCheckboxCircleLine, RiAlertLine,
  RiFileTextLine, RiTimeLine, RiDatabase2Line,
} from "react-icons/ri";
import DashboardCard from "../components/dashboard/DashboardCard";
import RecentCases from "../components/dashboard/RecentCases";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import { CardSkeleton, ChartSkeleton } from "../components/common/Skeleton";
import useApi from "../hooks/useApi";
import { analyticsService } from "../services/analyticsService";

const COLORS = ["#22d3ee", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#0f172a",
    border: "1px solid #1e3a5f",
    borderRadius: "10px",
    fontSize: "12px",
  },
};

const Dashboard = () => {
  const { data, loading } = useApi(analyticsService.getSummary);

  const stats = data?.stats || {};
  const charts = data?.charts || {};
  const recentCases = data?.recentCases || [];
  const activities = data?.activities || [];

  return (
    <div className="space-y-6 fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <DashboardCard title="Total Cases" value={stats.totalCases} icon={<RiFolderLine />} color="cyan" subtitle="All registered cases" />
            <DashboardCard title="Open Cases" value={stats.openCases} icon={<RiFileTextLine />} color="blue" subtitle="Awaiting action" />
            <DashboardCard title="Closed Cases" value={stats.closedCases} icon={<RiCheckboxCircleLine />} color="emerald" subtitle="Successfully resolved" />
            <DashboardCard title="Critical Alerts" value={stats.criticalAlerts} icon={<RiAlertLine />} color="red" subtitle="Immediate attention" />
            <DashboardCard title="Today's FIR" value={stats.todayFIR} icon={<RiTimeLine />} color="violet" subtitle="Filed today" />
            <DashboardCard title="Pending" value={stats.pendingCases} icon={<RiTimeLine />} color="amber" subtitle="Awaiting review" />
            <DashboardCard title="Under Investigation" value={stats.activeInvestigations} icon={<RiFolderLine />} color="blue" subtitle="Active investigations" />
            <DashboardCard title="Evidence Files" value={stats.totalEvidence} icon={<RiDatabase2Line />} color="cyan" subtitle="Total uploaded" />
          </>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Monthly FIR Area Chart */}
        <div className="xl:col-span-2">
          {loading ? <ChartSkeleton /> : (
            <div className="glass rounded-xl p-5">
              <h3 className="text-slate-100 font-semibold mb-5">Monthly FIR Statistics</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={charts.monthlyFIR || []}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="solvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="total" stroke="#22d3ee" fill="url(#totalGrad)" strokeWidth={2} name="Total FIR" />
                  <Area type="monotone" dataKey="solved" stroke="#10b981" fill="url(#solvedGrad)" strokeWidth={2} name="Solved" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Crime Category Pie */}
        {loading ? <ChartSkeleton /> : (
          <div className="glass rounded-xl p-5">
            <h3 className="text-slate-100 font-semibold mb-5">Crime Categories</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={charts.crimeCategories || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {(charts.crimeCategories || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Priority Bar Chart */}
        {loading ? <ChartSkeleton /> : (
          <div className="glass rounded-xl p-5">
            <h3 className="text-slate-100 font-semibold mb-5">Cases by Priority</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.priorityBreakdown || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Bar dataKey="critical" fill="#ef4444" radius={[4, 4, 0, 0]} name="Critical" />
                <Bar dataKey="high" fill="#f97316" radius={[4, 4, 0, 0]} name="High" />
                <Bar dataKey="medium" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Medium" />
                <Bar dataKey="low" fill="#64748b" radius={[4, 4, 0, 0]} name="Low" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status Pie */}
        {loading ? <ChartSkeleton /> : (
          <div className="glass rounded-xl p-5">
            <h3 className="text-slate-100 font-semibold mb-5">Case Status Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={charts.statusDistribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {(charts.statusDistribution || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Cases + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RecentCases cases={recentCases} loading={loading} />
        </div>
        <ActivityFeed activities={activities} loading={loading} />
      </div>
    </div>
  );
};

export default Dashboard;

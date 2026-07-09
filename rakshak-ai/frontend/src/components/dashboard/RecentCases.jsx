import { Link } from "react-router-dom";
import Badge from "../common/Badge";
import { STATUS_COLORS, PRIORITY_COLORS } from "../../constants";
import { formatDate, truncate } from "../../utils/formatters";

const RecentCases = ({ cases = [] }) => (
  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl">
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
      <h3 className="text-slate-100 font-semibold">Recent Cases</h3>
      <Link to="/cases" className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
        View all
      </Link>
    </div>
    <div className="divide-y divide-slate-700/30">
      {cases.map((c) => (
        <Link
          key={c._id}
          to={`/cases/${c._id}`}
          className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-700/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-sm font-medium truncate">{c.title}</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {c.caseNumber} · {formatDate(c.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Badge label={c.priority} className={PRIORITY_COLORS[c.priority]} />
            <Badge label={c.status} className={STATUS_COLORS[c.status]} />
          </div>
        </Link>
      ))}
    </div>
  </div>
);

export default RecentCases;

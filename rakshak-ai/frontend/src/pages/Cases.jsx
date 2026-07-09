import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RiAddLine, RiSearchLine, RiFilterLine } from "react-icons/ri";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import Spinner from "../components/common/Spinner";
import EmptyState from "../components/common/EmptyState";
import useApi from "../hooks/useApi";
import useDebounce from "../hooks/useDebounce";
import { casesService } from "../services/casesService";
import { STATUS_COLORS, PRIORITY_COLORS } from "../constants";
import { formatDate } from "../utils/formatters";

const Cases = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebounce(search);

  const { data, loading } = useApi(
    () => casesService.getAll({ search: debouncedSearch, status: statusFilter }),
    null,
    true
  );

  const cases = data?.cases || [];

  return (
    <div>
      <PageHeader
        title="Cases"
        subtitle="Manage and track all registered cases"
        actions={
          <Button icon={<RiAddLine />} onClick={() => navigate("/upload-fir")}>
            New Case
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, case number..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="pending">Pending</option>
          <option value="under_investigation">Under Investigation</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : cases.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No cases found"
          description="No cases match your search criteria."
          action={
            <Button icon={<RiAddLine />} onClick={() => navigate("/upload-fir")}>
              Create First Case
            </Button>
          }
        />
      ) : (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                {["Case No.", "Title", "Type", "Priority", "Status", "Date", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-slate-400 font-medium text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {cases.map((c) => (
                <tr
                  key={c._id}
                  className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/cases/${c._id}`)}
                >
                  <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{c.caseNumber}</td>
                  <td className="px-5 py-3.5 text-slate-200 font-medium max-w-xs truncate">{c.title}</td>
                  <td className="px-5 py-3.5 text-slate-400">{c.type}</td>
                  <td className="px-5 py-3.5">
                    <Badge label={c.priority} className={PRIORITY_COLORS[c.priority]} />
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge label={c.status} className={STATUS_COLORS[c.status]} />
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">{formatDate(c.createdAt)}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-right">→</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Cases;

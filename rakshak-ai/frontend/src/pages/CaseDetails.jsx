import { useParams, useNavigate } from "react-router-dom";
import { RiArrowLeftLine, RiRobot2Line, RiFileTextLine } from "react-icons/ri";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import Spinner from "../components/common/Spinner";
import useApi from "../hooks/useApi";
import { casesService } from "../services/casesService";
import { STATUS_COLORS, PRIORITY_COLORS } from "../constants";
import { formatDateTime } from "../utils/formatters";

const DetailRow = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
    <span className="text-slate-200 text-sm">{value || "—"}</span>
  </div>
);

const CaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading } = useApi(() => casesService.getById(id));

  if (loading) return <Spinner />;

  const c = data?.case;
  if (!c) return <p className="text-slate-400">Case not found.</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.title}
        subtitle={`Case No: ${c.caseNumber}`}
        actions={
          <>
            <Button variant="outline" icon={<RiArrowLeftLine />} onClick={() => navigate("/cases")}>
              Back
            </Button>
            <Button variant="secondary" icon={<RiRobot2Line />} onClick={() => navigate("/ai-assistant")}>
              AI Analyze
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-slate-100 font-semibold mb-4">Case Information</h3>
            <div className="grid grid-cols-2 gap-5">
              <DetailRow label="Status">
                <Badge label={c.status} className={STATUS_COLORS[c.status]} />
              </DetailRow>
              <DetailRow label="Priority">
                <Badge label={c.priority} className={PRIORITY_COLORS[c.priority]} />
              </DetailRow>
              <DetailRow label="Type" value={c.type} />
              <DetailRow label="Location" value={c.location} />
              <DetailRow label="Assigned Officer" value={c.assignedOfficer?.name} />
              <DetailRow label="Date Filed" value={formatDateTime(c.createdAt)} />
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-slate-100 font-semibold mb-3">Description</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{c.description || "No description provided."}</p>
          </div>

          {c.aiSummary && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <RiRobot2Line className="text-cyan-400" />
                <h3 className="text-cyan-400 font-semibold text-sm">AI Summary</h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{c.aiSummary}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-slate-100 font-semibold mb-4">Evidence</h3>
            {c.evidence?.length > 0 ? (
              <div className="space-y-2">
                {c.evidence.map((e) => (
                  <div key={e._id} className="flex items-center gap-2 text-sm text-slate-300">
                    <RiFileTextLine className="text-slate-500 shrink-0" />
                    {e.filename}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No evidence attached.</p>
            )}
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-slate-100 font-semibold mb-4">Suspects</h3>
            {c.suspects?.length > 0 ? (
              <div className="space-y-2">
                {c.suspects.map((s, i) => (
                  <div key={i} className="text-sm text-slate-300 py-1.5 border-b border-slate-700/50 last:border-0">
                    {s.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No suspects listed.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetails;

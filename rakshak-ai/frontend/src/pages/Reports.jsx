import { useState } from "react";
import { RiFileListLine, RiDownloadLine, RiAddLine, RiRobot2Line } from "react-icons/ri";
import toast from "react-hot-toast";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import useApi from "../hooks/useApi";
import { reportsService } from "../services/reportsService";
import { formatDateTime } from "../utils/formatters";

const Reports = () => {
  const { data, loading, execute } = useApi(reportsService.getAll);
  const [generating, setGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [reportType, setReportType] = useState("case_summary");

  const reports = data?.reports || [];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await reportsService.generate({ type: reportType });
      toast.success("Report generated");
      setModalOpen(false);
      execute();
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (id, name) => {
    try {
      const res = await reportsService.download(id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate and manage intelligence reports"
        actions={
          <Button icon={<RiAddLine />} onClick={() => setModalOpen(true)}>
            Generate Report
          </Button>
        }
      />

      {loading ? (
        <Spinner />
      ) : reports.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No reports yet"
          description="Generate your first intelligence report."
          action={<Button icon={<RiAddLine />} onClick={() => setModalOpen(true)}>Generate Report</Button>}
        />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r._id} className="flex items-center justify-between bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-4 hover:border-slate-600 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-slate-700/50 rounded-lg text-cyan-400">
                  <RiFileListLine size={18} />
                </div>
                <div>
                  <p className="text-slate-200 font-medium text-sm">{r.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{r.type} · {formatDateTime(r.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.aiGenerated && (
                  <span className="flex items-center gap-1 text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">
                    <RiRobot2Line size={12} /> AI
                  </span>
                )}
                <Button variant="outline" size="sm" icon={<RiDownloadLine />} onClick={() => handleDownload(r._id, r.title)}>
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Generate Report">
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="case_summary">Case Summary</option>
              <option value="crime_analysis">Crime Analysis</option>
              <option value="officer_performance">Officer Performance</option>
              <option value="monthly_report">Monthly Report</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleGenerate} loading={generating} className="flex-1 justify-center">
              Generate
            </Button>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1 justify-center">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Reports;

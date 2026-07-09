import { useState } from "react";
import { RiUploadCloud2Line, RiFileLine, RiEyeLine, RiRobot2Line } from "react-icons/ri";
import toast from "react-hot-toast";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import EmptyState from "../components/common/EmptyState";
import Badge from "../components/common/Badge";
import useApi from "../hooks/useApi";
import { evidenceService } from "../services/evidenceService";
import { formatDateTime } from "../utils/formatters";

const Evidence = () => {
  const { data, loading, execute } = useApi(evidenceService.getAll);
  const [analyzing, setAnalyzing] = useState(null);

  const evidence = data?.evidence || [];

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    try {
      await evidenceService.upload(formData);
      toast.success("Evidence uploaded");
      execute();
    } catch {
      toast.error("Upload failed");
    }
  };

  const handleAnalyze = async (id) => {
    setAnalyzing(id);
    try {
      await evidenceService.analyze(id);
      toast.success("Analysis complete");
      execute();
    } catch {
      toast.error("Analysis failed");
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Evidence"
        subtitle="Manage and analyze case evidence"
        actions={
          <label className="cursor-pointer">
            <Button as="span" icon={<RiUploadCloud2Line />}>Upload Evidence</Button>
            <input type="file" multiple className="hidden" onChange={handleUpload} />
          </label>
        }
      />

      {loading ? (
        <Spinner />
      ) : evidence.length === 0 ? (
        <EmptyState icon="🗂️" title="No evidence found" description="Upload evidence files to get started." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {evidence.map((e) => (
            <div key={e._id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-slate-700/50 rounded-lg text-cyan-400">
                  <RiFileLine size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">{e.filename}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{e.fileType} · {formatDateTime(e.createdAt)}</p>
                  {e.caseId && (
                    <p className="text-slate-500 text-xs mt-0.5">Case: {e.caseId.caseNumber}</p>
                  )}
                </div>
              </div>

              {e.aiAnalysis && (
                <div className="mt-3 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                  <p className="text-cyan-400 text-xs font-medium mb-1">AI Analysis</p>
                  <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{e.aiAnalysis}</p>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <Button variant="ghost" size="sm" icon={<RiEyeLine />} onClick={() => window.open(e.url, "_blank")}>
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RiRobot2Line />}
                  loading={analyzing === e._id}
                  onClick={() => handleAnalyze(e._id)}
                >
                  Analyze
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Evidence;

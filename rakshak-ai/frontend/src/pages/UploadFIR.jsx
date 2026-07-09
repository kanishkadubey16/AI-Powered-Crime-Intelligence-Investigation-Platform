import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { RiUploadCloud2Line, RiFileLine, RiCloseLine } from "react-icons/ri";
import PageHeader from "../components/common/PageHeader";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import { casesService } from "../services/casesService";

const schema = z.object({
  title: z.string().min(3, "Title too short"),
  type: z.string().min(1, "Select case type"),
  priority: z.string().min(1, "Select priority"),
  location: z.string().min(2, "Location required"),
  description: z.string().min(10, "Description too short"),
  complainantName: z.string().min(2, "Name required"),
  complainantContact: z.string().min(10, "Valid contact required"),
});

const caseTypes = [
  { value: "", label: "Select type" },
  { value: "theft", label: "Theft" },
  { value: "assault", label: "Assault" },
  { value: "fraud", label: "Fraud" },
  { value: "murder", label: "Murder" },
  { value: "cybercrime", label: "Cybercrime" },
  { value: "kidnapping", label: "Kidnapping" },
  { value: "other", label: "Other" },
];

const priorities = [
  { value: "", label: "Select priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const UploadFIR = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, v));
      files.forEach((f) => formData.append("files", f));
      const res = await casesService.uploadFIR(formData);
      toast.success("FIR registered successfully");
      navigate(`/cases/${res.data.case._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to register FIR");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <PageHeader
        title="Upload FIR"
        subtitle="Register a new First Information Report"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
        {/* Case Info */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <h3 className="text-slate-100 font-semibold">Case Information</h3>
          <Input label="Case Title" placeholder="Brief title of the incident" error={errors.title?.message} {...register("title")} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Case Type" options={caseTypes} error={errors.type?.message} {...register("type")} />
            <Select label="Priority" options={priorities} error={errors.priority?.message} {...register("priority")} />
          </div>
          <Input label="Location" placeholder="Incident location" error={errors.location?.message} {...register("location")} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea
              rows={4}
              placeholder="Detailed description of the incident..."
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none transition-all"
              {...register("description")}
            />
            {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
          </div>
        </div>

        {/* Complainant */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <h3 className="text-slate-100 font-semibold">Complainant Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" placeholder="Complainant name" error={errors.complainantName?.message} {...register("complainantName")} />
            <Input label="Contact" placeholder="Phone number" error={errors.complainantContact?.message} {...register("complainantContact")} />
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <h3 className="text-slate-100 font-semibold">Attachments</h3>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-xl p-8 cursor-pointer transition-colors">
            <RiUploadCloud2Line className="text-4xl text-slate-500 mb-2" />
            <p className="text-slate-400 text-sm">Click to upload or drag & drop</p>
            <p className="text-slate-600 text-xs mt-1">PDF, Images, Videos up to 50MB</p>
            <input type="file" multiple className="hidden" onChange={handleFileChange} />
          </label>
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <RiFileLine className="text-slate-400" />
                    {f.name}
                  </div>
                  <button type="button" onClick={() => removeFile(i)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <RiCloseLine />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Register FIR</Button>
          <Button type="button" variant="outline" onClick={() => navigate("/cases")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
};

export default UploadFIR;

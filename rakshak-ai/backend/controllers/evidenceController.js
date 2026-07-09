const { Evidence, Case } = require("../models");

const getFileType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  if (mimetype.includes("pdf") || mimetype.includes("word")) return "document";
  return "other";
};

const getEvidence = async (req, res) => {
  const filter = {};
  if (req.query.caseId) filter.caseId = req.query.caseId;

  const evidence = await Evidence.find(filter)
    .populate("caseId", "caseNumber title")
    .populate("uploadedBy", "name badgeNumber")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, evidence });
};

const getEvidenceById = async (req, res) => {
  const evidence = await Evidence.findById(req.params.id)
    .populate("caseId", "caseNumber title")
    .populate("uploadedBy", "name");

  if (!evidence) return res.status(404).json({ success: false, message: "Evidence not found." });
  res.status(200).json({ success: true, evidence });
};

const uploadEvidence = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: "No files uploaded." });
  }

  const { caseId, description } = req.body;
  if (!caseId) return res.status(400).json({ success: false, message: "caseId is required." });

  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) return res.status(404).json({ success: false, message: "Case not found." });

  const created = await Promise.all(
    req.files.map((file) =>
      Evidence.create({
        caseId, description,
        filename: file.filename,
        originalName: file.originalname,
        fileType: getFileType(file.mimetype),
        mimeType: file.mimetype,
        fileSize: file.size,
        url: `/uploads/${file.filename}`,
        uploadedBy: req.user._id,
      })
    )
  );

  await Case.findByIdAndUpdate(caseId, { $push: { evidence: { $each: created.map((e) => e._id) } } });
  res.status(201).json({ success: true, evidence: created });
};

const analyzeEvidence = async (req, res) => {
  const evidence = await Evidence.findById(req.params.id);
  if (!evidence) return res.status(404).json({ success: false, message: "Evidence not found." });

  evidence.aiAnalysis = "Analysis pending. ML service will process this file.";
  evidence.analysedAt = new Date();
  await evidence.save();

  res.status(200).json({ success: true, evidence });
};

const deleteEvidence = async (req, res) => {
  const evidence = await Evidence.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
  if (!evidence) return res.status(404).json({ success: false, message: "Evidence not found." });
  res.status(200).json({ success: true, message: "Evidence deleted." });
};

module.exports = { getEvidence, getEvidenceById, uploadEvidence, analyzeEvidence, deleteEvidence };

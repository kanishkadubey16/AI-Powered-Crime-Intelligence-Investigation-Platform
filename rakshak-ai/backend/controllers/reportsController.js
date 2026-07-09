const { Report, Case } = require("../models");
const { generateInvestigationReport } = require("../services/geminiService");

const getReports = async (req, res) => {
  const reports = await Report.find()
    .populate("caseId", "caseNumber title type status")
    .populate("generatedBy", "name badgeNumber")
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, reports });
};

const getReportById = async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate("caseId")
    .populate("generatedBy", "name badgeNumber");
  if (!report) return res.status(404).json({ success: false, message: "Report not found." });
  res.status(200).json({ success: true, report });
};

const generateReport = async (req, res) => {
  const { caseId, type = "case_summary" } = req.body;
  if (!caseId) return res.status(400).json({ success: false, message: "caseId is required." });

  const caseDoc = await Case.findById(caseId).populate("evidence").populate("assignedOfficer", "name");
  if (!caseDoc) return res.status(404).json({ success: false, message: "Case not found." });

  const content = await generateInvestigationReport(caseDoc.toObject());

  const report = await Report.findOneAndUpdate(
    { caseId, type },
    {
      caseId,
      title: `${type.replace(/_/g, " ").toUpperCase()} — ${caseDoc.caseNumber}`,
      type,
      content,
      generatedBy: req.user._id,
      aiGenerated: true,
      status: "draft",
    },
    { upsert: true, new: true }
  );

  await Case.findByIdAndUpdate(caseId, { report: report._id });
  res.status(201).json({ success: true, report });
};

// GET /api/reports/:id/download  — return content as downloadable text/PDF
const downloadReport = async (req, res) => {
  const report = await Report.findById(req.params.id).populate("caseId", "caseNumber title");
  if (!report) return res.status(404).json({ success: false, message: "Report not found." });

  // Send as plain text for now; PDF generation can be added with puppeteer/pdfkit
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="${report.title}.txt"`);
  res.send(report.content || `Report: ${report.title}\n\nContent not available.`);
};

module.exports = { getReports, getReportById, generateReport, downloadReport };

const { Report, Case } = require("../models");
const { generateInvestigationReport } = require("../services/ai");
const { generateReportPDF } = require("../utils/pdfGenerator");
const path = require("path");
const fs   = require("fs");

// POST /api/reports/generate-pdf
const generatePDF = async (req, res, next) => {
  try {
    const { caseId } = req.body;
    if (!caseId) return res.status(400).json({ success: false, message: "caseId is required." });

    const caseDoc = await Case.findById(caseId)
      .populate("evidence")
      .populate("filedBy",        "name badgeNumber department role")
      .populate("assignedOfficer", "name badgeNumber department role")
      .populate("report");

    if (!caseDoc) return res.status(404).json({ success: false, message: "Case not found." });

    // Use assignedOfficer if available, fall back to filedBy
    const officer = caseDoc.assignedOfficer || caseDoc.filedBy;

    const pdfBuffer = await generateReportPDF({
      caseDoc:     caseDoc.toObject(),
      report:      caseDoc.report || null,
      officer:     officer ? officer.toObject() : null,
      generatedAt: new Date(),
    });

    // Persist PDF to disk and record path in Report document
    const pdfDir      = path.join(__dirname, "../uploads/reports");
    fs.mkdirSync(pdfDir, { recursive: true });
    const filename    = `report-${caseDoc.caseNumber}-${Date.now()}.pdf`;
    const pdfPath     = path.join(pdfDir, filename);
    fs.writeFileSync(pdfPath, pdfBuffer);
    const relativePath = `/uploads/reports/${filename}`;

    // Upsert Report document with pdfPath
    await Report.findOneAndUpdate(
      { caseId },
      {
        caseId,
        title:       `Investigation Report — ${caseDoc.caseNumber}`,
        type:        "case_summary",
        generatedBy: req.user._id,
        aiGenerated: true,
        status:      "final",
        pdfPath:     relativePath,
      },
      { upsert: true, new: true }
    );

    // Stream PDF directly to client
    res.setHeader("Content-Type",        "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length",      pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// GET /api/reports
const getReports = async (req, res, next) => {
  try {
    const reports = await Report.find()
      .populate("caseId", "caseNumber title type status")
      .populate("generatedBy", "name badgeNumber")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reports.length, reports });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/:id
const getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("caseId")
      .populate("generatedBy", "name badgeNumber");
    if (!report) return res.status(404).json({ success: false, message: "Report not found." });
    res.status(200).json({ success: true, report });
  } catch (err) {
    next(err);
  }
};

// POST /api/reports/generate
const generateReport = async (req, res, next) => {
  try {
    const { caseId, type = "case_summary" } = req.body;
    if (!caseId) return res.status(400).json({ success: false, message: "caseId is required." });

    const caseDoc = await Case.findById(caseId)
      .populate("evidence")
      .populate("assignedOfficer", "name");
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
  } catch (err) {
    next(err);
  }
};

// PUT /api/reports/:id
const updateReport = async (req, res, next) => {
  try {
    const allowed = ["title", "content", "status", "type", "pdfPath"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const report = await Report.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("caseId", "caseNumber title")
      .populate("generatedBy", "name badgeNumber");

    if (!report) return res.status(404).json({ success: false, message: "Report not found." });
    res.status(200).json({ success: true, report });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/reports/:id
const deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found." });

    // Unlink from case
    await Case.findByIdAndUpdate(report.caseId, { $unset: { report: "" } });
    res.status(200).json({ success: true, message: "Report deleted." });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/:id/download
const downloadReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id).populate("caseId", "caseNumber title");
    if (!report) return res.status(404).json({ success: false, message: "Report not found." });

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="${report.title}.txt"`);
    res.send(report.content || `Report: ${report.title}\n\nContent not available.`);
  } catch (err) {
    next(err);
  }
};

module.exports = { getReports, getReportById, generateReport, updateReport, deleteReport, downloadReport, generatePDF };

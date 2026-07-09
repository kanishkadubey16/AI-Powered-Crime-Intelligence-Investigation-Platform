const { Case, Report } = require("../models");
const { analyzeFIR, generateInvestigationReport } = require("../services/geminiService");
const { queryLegalDocuments } = require("../services/ragService");
const { runInvestigationWorkflow } = require("../ai/agents/investigationWorkflow");

// POST /api/ai/chat  — RAG-powered legal Q&A
const chat = async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ success: false, message: "Message is required." });

  const reply = await queryLegalDocuments(message);
  res.status(200).json({ success: true, reply, sessionId });
};

// POST /api/ai/analyze-case/:caseId  — re-run Gemini analysis on a case
const analyzeCase = async (req, res) => {
  const caseDoc = await Case.findById(req.params.caseId).populate("evidence");
  if (!caseDoc) return res.status(404).json({ success: false, message: "Case not found." });

  const firText = `${caseDoc.title}\n${caseDoc.description || ""}\nLocation: ${caseDoc.location || ""}`;
  const aiAnalysis = await analyzeFIR(firText);

  caseDoc.aiSummary = aiAnalysis.summary;
  caseDoc.aiAnalysis = aiAnalysis;
  if (aiAnalysis.suspects?.length > 0) {
    caseDoc.suspects = aiAnalysis.suspects.map((s) => ({ name: s.name, description: s.description }));
  }
  await caseDoc.save();

  res.status(200).json({ success: true, aiAnalysis, case: caseDoc });
};

// POST /api/ai/run-workflow/:caseId  — run full LangGraph investigation workflow
const runWorkflow = async (req, res) => {
  const caseDoc = await Case.findById(req.params.caseId)
    .populate("evidence")
    .populate("assignedOfficer", "name badgeNumber");

  if (!caseDoc) return res.status(404).json({ success: false, message: "Case not found." });

  const workflowResult = await runInvestigationWorkflow(
    caseDoc.toObject(),
    caseDoc.aiSummary,
    caseDoc.mlPrediction
  );

  caseDoc.workflowReport = workflowResult;
  await caseDoc.save();

  res.status(200).json({ success: true, workflow: workflowResult });
};

// POST /api/ai/generate-report/:caseId  — generate + save report
const generateReport = async (req, res) => {
  const caseDoc = await Case.findById(req.params.caseId)
    .populate("evidence")
    .populate("assignedOfficer", "name");

  if (!caseDoc) return res.status(404).json({ success: false, message: "Case not found." });

  const content = await generateInvestigationReport(caseDoc.toObject());

  const report = await Report.findOneAndUpdate(
    { caseId: caseDoc._id },
    {
      caseId: caseDoc._id,
      title: `Investigation Report — ${caseDoc.caseNumber}`,
      type: "case_summary",
      content,
      generatedBy: req.user._id,
      aiGenerated: true,
      status: "draft",
    },
    { upsert: true, new: true }
  );

  await Case.findByIdAndUpdate(caseDoc._id, { report: report._id });
  res.status(200).json({ success: true, report });
};

// POST /api/ai/search-law  — direct legal search
const searchLaw = async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ success: false, message: "Query is required." });
  const result = await queryLegalDocuments(query);
  res.status(200).json({ success: true, result });
};

module.exports = { chat, analyzeCase, runWorkflow, generateReport, searchLaw };

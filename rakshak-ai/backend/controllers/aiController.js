const { Case, Report } = require("../models");
const { analyzeFIR, generateInvestigationReport } = require("../services/ai");
const { queryLegalDocuments } = require("../services/ragService");
const { runInvestigationWorkflow } = require("../ai/agents/investigationWorkflow");

const MIN_FIR_LENGTH = 20;

// POST /api/ai/analyze-fir
const analyzeFIRHandler = async (req, res, next) => {
  try {
    const { firText, caseId } = req.body;

    if (!firText || typeof firText !== "string" || firText.trim().length < MIN_FIR_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `firText is required and must be at least ${MIN_FIR_LENGTH} characters.`,
      });
    }

    const analysis = await analyzeFIR(firText.trim());
    analysis.analyzedAt = new Date();

    // If a caseId is provided, persist the analysis into the Case document
    if (caseId) {
      const caseDoc = await Case.findById(caseId);
      if (!caseDoc) {
        return res.status(404).json({ success: false, message: "Case not found." });
      }

      caseDoc.aiSummary = analysis.summary;
      caseDoc.aiAnalysis = analysis;

      // Promote priority from analysis if not already set by officer
      if (analysis.priority && caseDoc.priority === "medium") {
        caseDoc.priority = analysis.priority;
      }

      // Merge suspects extracted by AI into the case suspects array
      if (analysis.suspects?.length > 0) {
        const incoming = analysis.suspects.map((s) => ({
          name: s.name || "Unknown",
          description: s.description || "",
          status: "unknown",
        }));
        // Avoid duplicates by name
        const existingNames = new Set(caseDoc.suspects.map((s) => s.name.toLowerCase()));
        incoming.forEach((s) => {
          if (!existingNames.has(s.name.toLowerCase())) caseDoc.suspects.push(s);
        });
      }

      await caseDoc.save();

      return res.status(200).json({ success: true, analysis, caseId });
    }

    // No caseId — return analysis only, nothing persisted
    return res.status(200).json({ success: true, analysis });
  } catch (err) {
    next(err);
  }
};
// POST /api/ai/legal-query  — RAG-powered legal Q&A via Python RAG service
const legalQuery = async (req, res, next) => {
  try {
    const { question, caseId } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: "question is required." });
    }

    console.log("\n=========================");
    console.log("QUESTION");
    console.log("=========================");
    console.log(question);
    console.log();

    // If caseId is provided, fetch case/evidence/FIR for case-aware query
    const options = {};
    if (caseId) {
      const caseDoc = await Case.findById(caseId).populate("evidence");
      if (caseDoc) {
        options.caseData = caseDoc.toObject();
        options.evidenceData = caseDoc.evidence;
        options.firSummary = `${caseDoc.title}\n${caseDoc.description || ""}\nLocation: ${caseDoc.location || ""}`;
      }
    }

    const result = await queryLegalDocuments(question, options);

    console.log("\n" + "=".repeat(80));
    console.log("FINAL RESPONSE SENT TO FRONTEND (aiController.js):");
    console.log("=".repeat(80));
    console.log(JSON.stringify(result, null, 2));
    console.log();

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[aiController] Error in legalQuery:", err.message);
    console.error("[aiController] Error stack:", err.stack);
    const traceId = "TC-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
    console.error("[aiController] traceId:", traceId);

    // RAG service down or timed out (network-level failure, no HTTP response)
    if (err.code && ["ECONNREFUSED", "ECONNABORTED", "ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT"].includes(err.code)) {
      console.error(`[aiController] ML Service unreachable (Code: ${err.code}). Returning 503.`);
      return res.status(503).json({
        success: false,
        error: "ML_SERVICE_UNREACHABLE",
        message: "RAG service is unavailable. Ensure the ML service is running on port 8000.",
        traceId,
        code: err.code,
      });
    }

    // ML service returned an HTTP response with structured JSON error — forward verbatim
    if (err.response && err.response.data && typeof err.response.data === "object" && err.response.data.success === false) {
      const mlStatus = err.response.status;
      const mlPayload = err.response.data;
      console.error(`[aiController] ML Service returned HTTP ${mlStatus} with structured error:`, JSON.stringify(mlPayload));
      return res.status(mlStatus).json({
        success: false,
        error: mlPayload.error || "ML_SERVICE_ERROR",
        message: mlPayload.message || "RAG service reported an internal error.",
        traceId: mlPayload.traceback_id || traceId,
        mlTracebackId: mlPayload.traceback_id,
        details: mlPayload.details || null,
      });
    }

    // Generic 5xx from ML without structured payload — still avoid the uninformative generic string
    if (err.response && err.response.status >= 500) {
       console.error(`[aiController] ML Service returned ${err.response.status} without structured payload.`);
       return res.status(err.response.status).json({
         success: false,
         error: "ML_SERVICE_HTTP_" + err.response.status,
         message: (err.response.data && (typeof err.response.data === "string" ? err.response.data : (err.response.data.message || "RAG service internal error"))) || "RAG service reported an internal error.",
         traceId,
       });
    }

    next(err);
  }
};

// POST /api/ai/chat  — legacy RAG-powered legal Q&A
const chat = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Message is required." });

    const result = await queryLegalDocuments(message);
    res.status(200).json({ success: true, reply: result.answer, sessionId });
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/analyze-case/:caseId  — re-run Gemini analysis on a case
const analyzeCase = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/generate-investigation-report/:caseId
const generateInvestigationReportHandler = async (req, res, next) => {
  try {
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

    return res.status(200).json({
      success: true,
      report: workflowResult.supervisorReport,
      fullWorkflow: workflowResult,
      caseId: caseDoc._id,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/run-workflow/:caseId  — run full LangGraph investigation workflow
const runWorkflow = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/generate-report/:caseId  — generate + save report
const generateReport = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/search-law  — direct legal search (legacy)
const searchLaw = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, message: "Query is required." });
    const result = await queryLegalDocuments(query);
    res.status(200).json({ success: true, result });
  } catch (err) {
    next(err);
  }
};

module.exports = { chat, analyzeCase, runWorkflow, generateReport, searchLaw, legalQuery, analyzeFIRHandler, generateInvestigationReportHandler };

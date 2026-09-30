const { runInvestigationAgent } = require("./investigationAgent");
const { runEvidenceAgent }      = require("./evidenceAgent");
const { runLegalAgent }         = require("./legalAgent");
const { runSupervisorAgent }    = require("./supervisorAgent");

/**
 * Runs the full multi-agent investigation workflow.
 *
 * Pipeline:
 *   Case Data → Investigation Agent → Evidence Agent → Legal Agent → Supervisor Agent
 *
 * @param {Object} caseDetails  - Mongoose Case document (toObject())
 * @param {string} aiSummary    - Pre-existing Gemini FIR summary (may be null)
 * @param {Object} mlPrediction - ML service prediction { estimatedDays }
 * @returns {Object} Final structured investigation report
 */
const runInvestigationWorkflow = async (caseDetails, aiSummary, mlPrediction) => {
  console.log(`\n${"=".repeat(55)}`);
  console.log(`  Rakshak AI — Investigation Workflow`);
  console.log(`  Case: ${caseDetails.caseNumber}`);
  console.log("=".repeat(55));

  // Shared state object passed through every agent
  let state = { caseDetails, aiSummary, mlPrediction };

  console.log("\n[1/4] Running Investigation Agent...");
  state = await runInvestigationAgent(state);

  console.log("\n[2/4] Running Evidence Agent...");
  state = await runEvidenceAgent(state);

  console.log("\n[3/4] Running Legal Agent (with RAG)...");
  state = await runLegalAgent(state);

  console.log("\n[4/4] Running Supervisor Agent...");
  state = await runSupervisorAgent(state);

  const report = {
    caseNumber:             caseDetails.caseNumber,
    investigationAnalysis:  state.investigationAnalysis,
    evidenceAnalysis:       state.evidenceAnalysis,
    legalAnalysis:          state.legalAnalysis,
    supervisorReport:       state.supervisorReport,
    generatedAt:            new Date().toISOString(),
  };

  console.log(`\n  Workflow complete — confidence: ${state.supervisorReport?.confidenceScore ?? "N/A"}%`);
  console.log("=".repeat(55) + "\n");

  return report;
};

module.exports = { runInvestigationWorkflow };

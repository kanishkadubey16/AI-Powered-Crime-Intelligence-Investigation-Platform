const axios = require("axios");

const RAG_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const TIMEOUT_MS = 90000; // 90s — large legal docs + first-request model load

console.log("=== Backend ragService initialized ===");
console.log("ML_SERVICE_URL:", RAG_URL);
console.log();

const queryLegalDocuments = async (question, options = {}) => {
  console.log("[Backend] Request received");
  console.log("=== queryLegalDocuments called ===");
  const payload = { question };
  
  // Pass optional case data if provided
  if (options.caseData) {
    payload.case_data = options.caseData;
  }
  if (options.evidenceData) {
    payload.evidence_data = options.evidenceData;
  }
  if (options.firSummary) {
    payload.fir_summary = options.firSummary;
  }

  console.log("[Backend] Sending request to ML");
  console.log("Request URL:", `${RAG_URL}/legal-query`);
  console.log("Request Payload:", JSON.stringify(payload, null, 2));
  console.log();
  
  try {
    const response = await axios.post(
      `${RAG_URL}/legal-query`,
      payload,
      { timeout: TIMEOUT_MS }
    );
    console.log("[Backend] ML Service Response received");
    console.log("=== ML Service Response ===");
    console.log("Status Code:", response.status);
    console.log("Response Data:", JSON.stringify(response.data, null, 2));
    console.log("\n" + "=".repeat(80));
    console.log("BACKEND RESPONSE (ragService.js):");
    console.log("=".repeat(80));
    console.log(JSON.stringify(response.data, null, 2));
    console.log();
    return response.data;
  } catch (err) {
    console.log("=== ERROR calling ML Service ===");
    console.log("Error Code:", err.code);
    console.log("Response Status:", err.response?.status);
    console.log("Response Data:", JSON.stringify(err.response?.data, null, 2));
    console.log("Stack Trace:", err.stack);
    console.log();
    throw err;
  }
};

module.exports = { queryLegalDocuments };

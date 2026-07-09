const axios = require("axios");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const predictInvestigationTime = async (caseData) => {
  try {
    const payload = {
      crime_type: caseData.type,
      severity: caseData.priority,
      witness_count: caseData.witnesses || 0,
      evidence_count: caseData.evidence?.length || 0,
      officer_workload: caseData.officerWorkload || 3,
      previous_similar_cases: caseData.previousSimilarCases || 0,
    };

    const response = await axios.post(`${ML_URL}/predict-time`, payload, {
      timeout: 10000,
    });

    return response.data;
  } catch (err) {
    console.error("ML service error:", err.message);
    // Return a fallback estimate if ML service is down
    return {
      predicted_days: null,
      confidence: null,
      message: "ML service unavailable. Prediction skipped.",
    };
  }
};

module.exports = { predictInvestigationTime };

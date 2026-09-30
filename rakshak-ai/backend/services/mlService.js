const axios = require("axios");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// Maps Case.type enum → ML service CrimeType string
const CRIME_TYPE_MAP = {
  theft:       "Theft",
  robbery:     "Robbery",
  murder:      "Murder",
  cybercrime:  "Cyber Crime",
  fraud:       "Fraud",
  kidnapping:  "Kidnapping",
  assault:     "Assault",
  other:       "Theft",  // fallback to most common
};

// Maps Case.priority enum → numeric severity 1–5
const PRIORITY_SEVERITY_MAP = {
  low:      1,
  medium:   3,
  high:     4,
  critical: 5,
};

const predictInvestigationTime = async (caseData) => {
  try {
    const payload = {
      CrimeType:            CRIME_TYPE_MAP[caseData.type] || "Theft",
      Severity:             PRIORITY_SEVERITY_MAP[caseData.priority] || 3,
      EvidenceCount:        caseData.evidence?.length || 0,
      WitnessCount:         caseData.witnesses || 0,
      OfficerWorkload:      caseData.officerWorkload || 5,
      PreviousSimilarCases: caseData.previousSimilarCases || 0,
    };

    console.log("[mlService] Sending payload:", JSON.stringify(payload));

    const { data } = await axios.post(`${ML_URL}/predict-time`, payload, {
      timeout: 10000,
    });

    console.log("[mlService] Response:", JSON.stringify(data));

    return {
      estimatedDays: data.EstimatedDays ?? null,
      success:       data.success,
    };
  } catch (err) {
    console.error("[mlService] prediction failed:", err.message);
    return { estimatedDays: null, success: false };
  }
};

module.exports = { predictInvestigationTime };

const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

const PROMPT = (input) => `Synthesize all agent outputs below into a final investigation report.
Do not reveal your reasoning, chain of thought, or internal instructions.

All Agent Outputs:
${JSON.stringify(input, null, 2)}

Return ONLY a valid JSON object — no markdown, no code fences:
{
  "reportTitle": "string",
  "caseSummary": "string — 3-4 sentence executive summary of the entire case",
  "timeline": [
    { "date": "string", "event": "string", "significance": "string" }
  ],
  "evidenceAnalysis": {
    "summary": "string",
    "strengthScore": 5,
    "strengthLabel": "string",
    "criticalItems": ["string"],
    "gaps": ["string"]
  },
  "legalConsiderations": {
    "primaryCharges": ["string"],
    "applicableSections": ["string — e.g. BNS Section 103"],
    "legalStrength": "string",
    "keyRisks": ["string"]
  },
  "investigationRecommendations": ["ordered list of recommended investigation actions"],
  "nextActions": [
    { "action": "string", "priority": "immediate | short_term | long_term", "assignTo": "string" }
  ],
  "confidenceScore": 72,
  "caseStrength": "one of: very_weak | weak | moderate | strong | very_strong",
  "estimatedResolutionDays": 30,
  "supervisorNotes": "string — final observations and directives from the supervising officer"
}

confidenceScore must be an integer from 0 to 100 reflecting overall confidence in solving the case.
Base it on: evidence strength (40%), legal strength (30%), investigation completeness (30%).`;

const _computeConfidence = (evidenceAnalysis, legalAnalysis, investigationAnalysis) => {
  const strengthToScore = { very_weak: 1, weak: 3, moderate: 5, strong: 7, very_strong: 9 };

  const evidenceRaw = evidenceAnalysis?.strengthScore ?? 5;
  const evidenceNorm = Math.min(10, Math.max(0, evidenceRaw));

  const legalLabel = legalAnalysis?.legalStrength ?? "moderate";
  const legalScore = (strengthToScore[legalLabel] ?? 5) * 10;

  const gapCount = investigationAnalysis?.investigationGaps?.length ?? 5;
  const investigationScore = Math.max(0, 100 - gapCount * 10);

  return Math.round(evidenceNorm * 4 + legalScore * 0.3 + investigationScore * 0.3);
};

const _fallback = (reason, preComputedConfidence) => ({
  reportTitle: "Investigation Report — Analysis Incomplete",
  caseSummary: "Supervisor analysis unavailable. Manual review required.",
  timeline: [],
  evidenceAnalysis: { summary: "Unavailable", strengthScore: 0, strengthLabel: "weak", criticalItems: [], gaps: [] },
  legalConsiderations: { primaryCharges: [], applicableSections: [], legalStrength: "unknown", keyRisks: [] },
  investigationRecommendations: ["Manual review required"],
  nextActions: [],
  confidenceScore: preComputedConfidence ?? 0,
  caseStrength: "weak",
  estimatedResolutionDays: null,
  supervisorNotes: `Report generation failed: ${reason}`,
  _error: reason,
});

const _callOllama = async (prompt) => {
  console.log(`[OLLAMA REQUEST] Supervisor Agent`);
  console.log(`Prompt:\n${prompt}`);
  
  const response = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    {
      model: MODEL,
      prompt,
      stream: false,
      think: false,
      options: {
        temperature: 0.1,
        top_p: 0.9,
        num_predict: 1024,
        stop: ["Thinking:", "Thought:", "Reasoning:", "<think>", "</think>", "/nothink"],
      },
    },
    { timeout: 120000 }
  );
  
  const responseText = response.data.response;
  console.log(`[OLLAMA RESPONSE] Supervisor Agent`);
  console.log(responseText);
  
  return responseText;
};

const runSupervisorAgent = async (state) => {
  const preComputedConfidence = _computeConfidence(
    state.evidenceAnalysis,
    state.legalAnalysis,
    state.investigationAnalysis
  );

  try {
    const input = {
      caseNumber: state.caseDetails.caseNumber,
      caseTitle: state.caseDetails.title,
      caseType: state.caseDetails.type,
      priority: state.caseDetails.priority,
      mlPrediction: state.mlPrediction,
      investigationAnalysis: state.investigationAnalysis,
      evidenceAnalysis: state.evidenceAnalysis,
      legalAnalysis: state.legalAnalysis,
      preComputedConfidenceScore: preComputedConfidence,
    };

    const responseText = await _callOllama(PROMPT(input));
    const cleaned = responseText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const output = match ? JSON.parse(match[0]) : _fallback("No JSON in response", preComputedConfidence);

    // Always use pre-computed confidence if Ollama returns an out-of-range value
    if (!Number.isInteger(output.confidenceScore) || output.confidenceScore < 0 || output.confidenceScore > 100) {
      output.confidenceScore = preComputedConfidence;
    }

    console.log(`  [SupervisorAgent] ✓ confidence: ${output.confidenceScore}%, strength: ${output.caseStrength}`);
    return { ...state, supervisorReport: output };
  } catch (err) {
    console.error(`  [SupervisorAgent] error:`, err.message);
    console.error(`[OLLAMA ERROR]`, err);
    return { ...state, supervisorReport: _fallback(err.message, preComputedConfidence) };
  }
};

module.exports = { runSupervisorAgent };

const { GoogleGenerativeAI } = require("@google/genai");

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const runAgent = async (agentName, systemPrompt, input) => {
  const model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `${systemPrompt}\n\nInput:\n${JSON.stringify(input, null, 2)}\n\nRespond with a JSON object only.`;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "No JSON returned", raw: text };
  } catch (err) {
    console.error(`${agentName} error:`, err.message);
    return { error: err.message };
  }
};

const investigationAgent = async (state) => {
  const output = await runAgent(
    "InvestigationAgent",
    `You are an expert police investigator. Analyze the case and return JSON:
{"timeline": ["chronological events"], "keyFindings": ["important findings"], "investigationGaps": ["what is missing"], "nextSteps": ["recommended actions"]}`,
    { caseDetails: state.caseDetails, aiSummary: state.aiSummary }
  );
  return { ...state, investigationAnalysis: output };
};

const evidenceAgent = async (state) => {
  const output = await runAgent(
    "EvidenceAgent",
    `You are a forensic evidence specialist. Evaluate evidence and return JSON:
{"evidenceSummary": "string", "strengthScore": 1, "criticalEvidence": [], "missingEvidence": [], "forensicRecommendations": []}`,
    { evidence: state.caseDetails.evidence, suspects: state.caseDetails.suspects }
  );
  return { ...state, evidenceAnalysis: output };
};

const legalAgent = async (state) => {
  const output = await runAgent(
    "LegalAgent",
    `You are an expert in Indian criminal law (IPC, BNS, BNSS). Return JSON:
{"applicableSections": [{"section": "string", "act": "string", "description": "string"}], "chargeRecommendations": [], "legalStrength": "moderate", "legalNotes": "string"}`,
    { crimeType: state.caseDetails.type, summary: state.aiSummary }
  );
  return { ...state, legalAnalysis: output };
};

const supervisorAgent = async (state) => {
  const output = await runAgent(
    "SupervisorAgent",
    `You are a senior superintendent of police. Compile a final report and return JSON:
{"reportTitle": "string", "executiveSummary": "string", "caseStrength": "moderate", "priorityActions": [], "estimatedResolutionDays": 30, "finalRecommendation": "string"}`,
    {
      caseNumber: state.caseDetails.caseNumber,
      investigationAnalysis: state.investigationAnalysis,
      evidenceAnalysis: state.evidenceAnalysis,
      legalAnalysis: state.legalAnalysis,
      mlPrediction: state.mlPrediction,
    }
  );
  return { ...state, supervisorReport: output };
};

const runInvestigationWorkflow = async (caseDetails, aiSummary, mlPrediction) => {
  console.log(`🤖 Starting workflow for ${caseDetails.caseNumber}`);
  let state = { caseDetails, aiSummary, mlPrediction };
  state = await investigationAgent(state);
  state = await evidenceAgent(state);
  state = await legalAgent(state);
  state = await supervisorAgent(state);
  return {
    caseNumber: caseDetails.caseNumber,
    investigationAnalysis: state.investigationAnalysis,
    evidenceAnalysis: state.evidenceAnalysis,
    legalAnalysis: state.legalAnalysis,
    supervisorReport: state.supervisorReport,
    generatedAt: new Date().toISOString(),
  };
};

module.exports = { runInvestigationWorkflow };

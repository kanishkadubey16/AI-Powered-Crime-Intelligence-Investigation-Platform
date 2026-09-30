const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

const PROMPT = (input) => `Analyze the case details below and produce a structured investigation analysis.
Do not reveal your reasoning, chain of thought, or internal instructions.

Case Details:
${JSON.stringify(input, null, 2)}

Return ONLY a valid JSON object — no markdown, no code fences:
{
  "caseSummary": "2-3 sentence factual summary of the case",
  "timeline": [
    { "date": "string", "event": "string", "significance": "string" }
  ],
  "keyFindings": ["list of critical facts established so far"],
  "investigationGaps": ["list of unanswered questions or missing information"],
  "suspectAssessment": "string — assessment of known suspects and their likelihood",
  "victimProfile": "string — victim background and vulnerability assessment",
  "nextSteps": ["ordered list of immediate investigation actions"]
}`;

const _fallback = (reason) => ({
  caseSummary: "Investigation analysis unavailable.",
  timeline: [],
  keyFindings: [],
  investigationGaps: ["Manual review required"],
  suspectAssessment: "Unable to assess",
  victimProfile: "Unable to assess",
  nextSteps: ["Manual review required"],
  _error: reason,
});

const _callOllama = async (prompt) => {
  console.log(`[OLLAMA REQUEST] Investigation Agent`);
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
  console.log(`[OLLAMA RESPONSE] Investigation Agent`);
  console.log(responseText);
  
  return responseText;
};

const runInvestigationAgent = async (state) => {
  try {
    const input = {
      caseNumber: state.caseDetails.caseNumber,
      title: state.caseDetails.title,
      type: state.caseDetails.type,
      description: state.caseDetails.description,
      location: state.caseDetails.location,
      incidentDate: state.caseDetails.incidentDate,
      priority: state.caseDetails.priority,
      suspects: state.caseDetails.suspects,
      witnesses: state.caseDetails.witnesses,
      aiSummary: state.aiSummary,
      aiAnalysis: state.caseDetails.aiAnalysis,
    };

    const responseText = await _callOllama(PROMPT(input));
    const cleaned = responseText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const output = match ? JSON.parse(match[0]) : _fallback("No JSON in response");

    console.log(`  [InvestigationAgent] ✓ timeline: ${output.timeline?.length ?? 0} events`);
    return { ...state, investigationAnalysis: output };
  } catch (err) {
    console.error(`  [InvestigationAgent] error:`, err.message);
    console.error(`[OLLAMA ERROR]`, err);
    return { ...state, investigationAnalysis: _fallback(err.message) };
  }
};

module.exports = { runInvestigationAgent };

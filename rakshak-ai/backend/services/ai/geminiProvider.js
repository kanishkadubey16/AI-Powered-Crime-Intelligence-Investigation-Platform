const { GoogleGenAI } = require("@google/genai");

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FIR_PROMPT = (firText) => `You are a senior crime analyst AI for Indian law enforcement.
Analyze the FIR (First Information Report) below and extract structured information.

FIR Content:
${firText}

Return ONLY a valid JSON object — no markdown, no code fences, no extra text.
Use exactly this structure:
{
  "summary": "2-3 sentence factual summary of the incident",
  "crimeCategory": "one of: theft | assault | fraud | murder | cybercrime | kidnapping | other",
  "priority": "one of: low | medium | high | critical",
  "riskLevel": "one of: low | medium | high | critical",
  "victims": [
    { "name": "string or Unknown", "age": null, "description": "string" }
  ],
  "suspects": [
    { "name": "string or Unknown", "description": "string", "status": "unknown" }
  ],
  "locations": ["list of specific locations mentioned in the FIR"],
  "importantDates": ["list of dates and times mentioned"],
  "evidenceMentioned": ["list of physical or digital evidence items mentioned"],
  "possibleMotive": "string — inferred motive based on FIR content",
  "investigationSteps": [
    "ordered list of concrete recommended investigation steps"
  ]
}

Rules:
- Extract only what is explicitly stated or strongly implied in the FIR.
- Do not invent names, dates, or evidence not present in the text.
- If a field has no data, return an empty array [] or null.`;

const REPORT_PROMPT = (caseData) => `You are a senior police investigator. Generate a professional investigation report for the following case.

Case Details:
- Case Number: ${caseData.caseNumber}
- Title: ${caseData.title}
- Type: ${caseData.type}
- Status: ${caseData.status}
- Priority: ${caseData.priority}
- Location: ${caseData.location || "Not specified"}
- Description: ${caseData.description || "Not provided"}
- AI Summary: ${caseData.aiSummary || "Not available"}
- Evidence Count: ${caseData.evidence?.length || 0}
- Suspects: ${JSON.stringify(caseData.suspects || [])}

Return a professional investigation report in plain text format with sections:
1. EXECUTIVE SUMMARY
2. INCIDENT DETAILS
3. INVESTIGATION FINDINGS
4. EVIDENCE ANALYSIS
5. SUSPECT INFORMATION
6. RECOMMENDED NEXT STEPS
7. CONCLUSION`;

const LEGAL_PROMPT = (question, context) => `You are a legal advisor AI for Indian law enforcement.
Based on the following context, answer the legal question.

Context:
${context}

Question:
${question}

Provide a clear, accurate response referencing relevant Indian laws (IPC, BNSS, BNS) where applicable.`;

const _parseJSON = (text) => {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
};

const analyzeFIR = async (firText) => {
  try {
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: FIR_PROMPT(firText),
    });
    const parsed = _parseJSON(response.text);
    if (!parsed) {
      throw new Error("Failed to parse Gemini response");
    }
    return parsed;
  } catch (err) {
    console.error(`[AI:Gemini] FIR analysis failed: ${err.message}`);
    throw err;
  }
};

const generateInvestigationReport = async (caseData) => {
  try {
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: REPORT_PROMPT(caseData),
    });
    return response.text;
  } catch (err) {
    console.error(`[AI:Gemini] Report generation failed: ${err.message}`);
    throw err;
  }
};

const answerLegalQuestion = async (question, context = "") => {
  try {
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: LEGAL_PROMPT(question, context),
    });
    return response.text;
  } catch (err) {
    console.error(`[AI:Gemini] Legal query failed: ${err.message}`);
    throw err;
  }
};

module.exports = {
  name: "gemini",
  analyzeFIR,
  generateInvestigationReport,
  answerLegalQuestion,
};
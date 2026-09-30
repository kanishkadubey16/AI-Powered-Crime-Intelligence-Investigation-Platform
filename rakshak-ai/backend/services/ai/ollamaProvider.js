const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";
const FALLBACK_MODELS = ["llama3.2:3b", "qwen2.5:3b", "gemma3:4b"];

const FIR_SYSTEM_PROMPT = `You are a senior crime analyst AI for Indian law enforcement.
Analyze the FIR (First Information Report) and return ONLY a valid JSON object with this exact structure:
{
  "summary": "2-3 sentence factual summary",
  "crimeCategory": "theft | assault | fraud | murder | cybercrime | kidnapping | other",
  "priority": "low | medium | high | critical",
  "riskLevel": "low | medium | high | critical",
  "victims": [{"name": "string", "age": null, "description": "string"}],
  "suspects": [{"name": "string", "description": "string", "status": "unknown"}],
  "locations": ["string"],
  "importantDates": ["string"],
  "evidenceMentioned": ["string"],
  "possibleMotive": "string",
  "investigationSteps": ["string"]
}`;

const REPORT_SYSTEM_PROMPT = `You are a senior police investigator. Generate a professional investigation report in plain text with sections:
1. EXECUTIVE SUMMARY
2. INCIDENT DETAILS
3. INVESTIGATION FINDINGS
4. EVIDENCE ANALYSIS
5. SUSPECT INFORMATION
6. RECOMMENDED NEXT STEPS
7. CONCLUSION`;

const LEGAL_SYSTEM_PROMPT = `You are a legal advisor AI for Indian law enforcement. Provide clear, accurate responses referencing relevant Indian laws (IPC, BNSS, BNS) where applicable.`;

const _checkOllamaAvailable = async () => {
  try {
    await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
    return true;
  } catch (err) {
    console.error(`[OLLAMA ERROR] Ollama not available: ${err.message}`);
    return false;
  }
};

const _callOllama = async (prompt, systemPrompt, format = null) => {
  const isAvailable = await _checkOllamaAvailable();
  if (!isAvailable) {
    throw new Error("Ollama is not running. Start it using 'ollama serve'.");
  }

  const modelsToTry = [MODEL, ...FALLBACK_MODELS.filter(m => m !== MODEL)];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const requestBody = {
        model: model,
        prompt,
        system: systemPrompt,
        stream: false,
        think: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          num_predict: 1024,
          stop: ["Thinking:", "Thought:", "Reasoning:", "<think>", "</think>", "/nothink"],
        },
      };
      if (format) {
        requestBody.format = format;
      }

      console.log(`[OLLAMA REQUEST]`);
      console.log(`Model: ${model}`);
      console.log(`System Prompt: ${systemPrompt}`);
      console.log(`Prompt:\n${prompt}`);

      const response = await axios.post(`${OLLAMA_URL}/api/generate`, requestBody, {
        timeout: 120000, // 2 minutes
      });

      const responseText = response.data.response;
      console.log(`[OLLAMA RESPONSE]`);
      console.log(responseText);

      return responseText;
    } catch (err) {
      console.error(`[OLLAMA ERROR] Model ${model} failed: ${err.message}`);
      console.error(`[OLLAMA ERROR DETAILS]`, err.stack);
      lastError = err;
    }
  }

  throw lastError || new Error("All Ollama models failed.");
};

const _parseJSON = (text) => {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`[OLLAMA ERROR] Failed to parse JSON: ${err.message}`);
    console.error(`[OLLAMA ERROR] Raw text to parse:`, text);
    return null;
  }
};

const analyzeFIR = async (firText) => {
  try {
    const response = await _callOllama(firText, FIR_SYSTEM_PROMPT, "json");
    const parsed = _parseJSON(response);
    if (!parsed) {
      throw new Error("Failed to parse Ollama response as JSON");
    }
    return parsed;
  } catch (err) {
    console.error(`[AI:Ollama] FIR analysis failed: ${err.message}`);
    throw err;
  }
};

const generateInvestigationReport = async (caseData) => {
  const prompt = `Case Details:
- Case Number: ${caseData.caseNumber}
- Title: ${caseData.title}
- Type: ${caseData.type}
- Status: ${caseData.status}
- Priority: ${caseData.priority}
- Location: ${caseData.location || "Not specified"}
- Description: ${caseData.description || "Not provided"}
- AI Summary: ${caseData.aiSummary || "Not available"}
- Evidence Count: ${caseData.evidence?.length || 0}
- Suspects: ${JSON.stringify(caseData.suspects || [])}`;

  try {
    return await _callOllama(prompt, REPORT_SYSTEM_PROMPT);
  } catch (err) {
    console.error(`[AI:Ollama] Report generation failed: ${err.message}`);
    throw err;
  }
};

const answerLegalQuestion = async (question, context = "") => {
  const prompt = `Context: ${context}\n\nQuestion: ${question}`;
  try {
    return await _callOllama(prompt, LEGAL_SYSTEM_PROMPT);
  } catch (err) {
    console.error(`[AI:Ollama] Legal query failed: ${err.message}`);
    throw err;
  }
};

module.exports = {
  name: "ollama",
  analyzeFIR,
  generateInvestigationReport,
  answerLegalQuestion,
};
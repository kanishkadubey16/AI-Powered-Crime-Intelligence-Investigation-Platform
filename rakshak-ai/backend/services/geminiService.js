const { GoogleGenAI } = require("@google/genai");

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const analyzeFIR = async (firText) => {
  try {
    const prompt = `You are a senior crime analyst AI. Analyze the following FIR (First Information Report) and extract structured information.

FIR Content:
${firText}

Return ONLY a valid JSON object with this exact structure:
{
  "summary": "Brief 2-3 sentence summary of the incident",
  "crimeType": "one of: theft|assault|fraud|murder|cybercrime|kidnapping|other",
  "priority": "one of: low|medium|high|critical",
  "victims": [{"name": "string", "age": null, "description": "string"}],
  "suspects": [{"name": "string", "description": "string", "status": "unknown"}],
  "locations": ["list of locations mentioned"],
  "dates": ["list of dates/times mentioned"],
  "possibleMotive": "string describing possible motive",
  "importantEvidence": ["list of key evidence items mentioned"],
  "recommendedActions": ["list of immediate actions recommended"]
}`;

    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Gemini response");

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Gemini FIR analysis error:", err.message);
    return {
      summary: "AI analysis unavailable. Please review manually.",
      crimeType: "other",
      priority: "medium",
      victims: [],
      suspects: [],
      locations: [],
      dates: [],
      possibleMotive: "Under investigation",
      importantEvidence: [],
      recommendedActions: ["Manual review required"],
    };
  }
};

const generateInvestigationReport = async (caseData) => {
  try {
    const prompt = `You are a senior police investigator. Generate a professional investigation report for the following case.

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

    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    return response.text;
  } catch (err) {
    console.error("Gemini report generation error:", err.message);
    return `Investigation Report for ${caseData.caseNumber}\n\nAI report generation unavailable. Please complete manually.`;
  }
};

module.exports = { analyzeFIR, generateInvestigationReport };

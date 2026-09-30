import api from "./api";

export const aiService = {
  chat: (message, sessionId) => api.post("/ai/chat", { message, sessionId }),
  legalQuery: async (question) => {
    console.log("\n" + "=".repeat(80));
    console.log("FRONTEND SENDING QUESTION:");
    console.log("=".repeat(80));
    console.log(question);
    console.log();
    const response = await api.post("/ai/legal-query", { question });
    console.log("\n" + "=".repeat(80));
    console.log("FRONTEND RESPONSE RECEIVED:");
    console.log("=".repeat(80));
    console.log(response.data);
    console.log();
    return response;
  },
  analyzeCase: (caseId) => api.post(`/ai/analyze-case/${caseId}`),
  analyzeFIR: (firText, caseId) => api.post("/ai/analyze-fir", { firText, caseId }),
  generateInvestigationReport: (caseId) => api.post(`/ai/generate-investigation-report/${caseId}`),
  generateReport: (caseId) => api.post(`/ai/generate-report/${caseId}`),
  searchLaw: (query) => api.post("/ai/search-law", { query }),
};

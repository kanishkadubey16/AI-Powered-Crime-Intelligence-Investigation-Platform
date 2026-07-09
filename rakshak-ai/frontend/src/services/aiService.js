import api from "./api";

export const aiService = {
  chat: (message, sessionId) => api.post("/ai/chat", { message, sessionId }),
  analyzeCase: (caseId) => api.post(`/ai/analyze-case/${caseId}`),
  generateReport: (caseId) => api.post(`/ai/generate-report/${caseId}`),
  searchLaw: (query) => api.post("/ai/search-law", { query }),
};

/**
 * AI Services - Unified Export
 * This is the main entry point for controllers
 */

const aiService = require("./aiService");

// Re-export all methods
module.exports = {
  analyzeFIR: aiService.analyzeFIR,
  generateInvestigationReport: aiService.generateInvestigationReport,
  answerLegalQuestion: aiService.answerLegalQuestion,
  getStats: aiService.getStats,
  setProvider: aiService.setProvider,
};
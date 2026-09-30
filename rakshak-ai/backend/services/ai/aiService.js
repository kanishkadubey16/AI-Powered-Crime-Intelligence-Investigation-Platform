/**
 * AI Service - Unified interface with automatic fallback
 * Supports: Gemini, Ollama, Mock (fallback)
 */

const geminiProvider = require("./geminiProvider");
const ollamaProvider = require("./ollamaProvider");
const mockProvider = require("./mockProvider");

const PROVIDERS = {
  gemini: geminiProvider,
  ollama: ollamaProvider,
  mock: mockProvider,
};

// Get configured provider from environment
const getProvider = () => {
  console.log("AI_PROVIDER =", process.env.AI_PROVIDER);
  const providerName = (process.env.AI_PROVIDER || "ollama").toLowerCase();
  console.log("Selected provider name:", providerName);
  return PROVIDERS[providerName] || PROVIDERS.mock;
};

// Current active provider
let currentProvider = getProvider();
let fallbackCount = 0;
let totalRequests = 0;

console.log(`[AI] Provider: ${currentProvider.name.toUpperCase()}`);

/**
 * Execute AI operation with automatic fallback to mock provider
 * @param {string} method - Provider method name to call
 * @param {Array} args - Arguments to pass to the method
 * @param {number} maxRetries - Maximum retry attempts with same provider
 */
const _executeWithFallback = async (method, args, maxRetries = 1) => {
  totalRequests++;
  let lastError = null;

  // Try current provider first
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (currentProvider[method]) {
        console.log(`[AI] Attempting ${method} with ${currentProvider.name}`);
        const result = await currentProvider[method](...args);
        if (attempt > 0) {
          console.log(`[AI] Retry ${attempt} succeeded with ${currentProvider.name}`);
        }
        return result;
      }
    } catch (err) {
      lastError = err;
      console.error(`[AI] Provider ${currentProvider.name} failed (attempt ${attempt + 1}): ${err.message}`);
      
      // Check if we should fallback
      const isRetryable = err.code === 429 || // Rate limit
                          err.code === 503 || // Service unavailable
                          err.code === "ECONNREFUSED" ||
                          err.message?.includes("quota") ||
                          err.message?.includes("timeout") ||
                          err.message?.includes("ECONNREFUSED");
      
      if (!isRetryable && attempt >= maxRetries) {
        break;
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  // Fallback to mock provider if primary fails
  if (currentProvider.name !== "mock") {
    console.log(`[AI] Provider failed, falling back to MOCK`);
    fallbackCount++;
    currentProvider = PROVIDERS.mock;
    
    try {
      const result = await currentProvider[method](...args);
      console.log(`[AI] Fallback succeeded with mock provider`);
      return result;
    } catch (mockErr) {
      console.error(`[AI] Even mock provider failed: ${mockErr.message}`);
      // Last resort - generate minimal fallback
      throw lastError || mockErr;
    }
  }

  // If already on mock and it fails, throw the error
  throw lastError;
};

/**
 * Analyze FIR text and extract structured information
 * @param {string} firText - The FIR content to analyze
 * @returns {Object} Structured AI analysis
 */
const analyzeFIR = async (firText) => {
  return _executeWithFallback("analyzeFIR", [firText]);
};

/**
 * Generate professional investigation report
 * @param {Object} caseData - Case information
 * @returns {string} Formatted investigation report
 */
const generateInvestigationReport = async (caseData) => {
  return _executeWithFallback("generateInvestigationReport", [caseData]);
};

/**
 * Answer legal questions based on context
 * @param {string} question - Legal question
 * @param {string} context - Additional context
 * @returns {string} Answer to legal question
 */
const answerLegalQuestion = async (question, context = "") => {
  return _executeWithFallback("answerLegalQuestion", [question, context]);
};

/**
 * Get AI service statistics
 */
const getStats = () => ({
  currentProvider: currentProvider.name,
  totalRequests,
  fallbackCount,
});

/**
 * Manually switch provider (for testing/admin)
 * @param {string} providerName - 'gemini', 'ollama', or 'mock'
 */
const setProvider = (providerName) => {
  if (PROVIDERS[providerName]) {
    currentProvider = PROVIDERS[providerName];
    console.log(`[AI] Provider manually switched to: ${providerName.toUpperCase()}`);
    return true;
  }
  return false;
};

module.exports = {
  analyzeFIR,
  generateInvestigationReport,
  answerLegalQuestion,
  getStats,
  setProvider,
  // Expose providers for direct access if needed
  providers: PROVIDERS,
};
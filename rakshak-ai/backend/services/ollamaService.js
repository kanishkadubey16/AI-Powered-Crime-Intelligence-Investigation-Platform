const axios = require("axios");

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

/**
 * Check if Ollama is running and available
 * @returns {Promise<boolean>}
 */
const isOllamaRunning = async () => {
  try {
    await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
    return true;
  } catch (err) {
    console.warn(`[OllamaService] Ollama not running: ${err.message}`);
    return false;
  }
};

/**
 * Send a prompt to Ollama and get a generated response
 * @param {string} prompt - User prompt
 * @param {string} [systemPrompt] - Optional system prompt
 * @param {Object} [options] - Optional parameters (format, temperature, etc.)
 * @returns {Promise<string>} Generated response text
 */
const sendPrompt = async (prompt, systemPrompt = "", options = {}) => {
  try {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: OLLAMA_MODEL,
        prompt,
        system: systemPrompt,
        stream: false,
        format: options.format,
        options: {
          temperature: options.temperature || 0.1,
          num_predict: options.maxTokens || 2048,
        },
      },
      {
        timeout: options.timeout || 60000,
      }
    );
    return response.data.response;
  } catch (err) {
    if (!await isOllamaRunning()) {
      throw new Error("Ollama is not running. Start it using: ollama serve");
    }
    console.error(`[OllamaService] Error calling Ollama: ${err.message}`);
    throw new Error(`Ollama API error: ${err.message}`);
  }
};

module.exports = {
  isOllamaRunning,
  sendPrompt,
};

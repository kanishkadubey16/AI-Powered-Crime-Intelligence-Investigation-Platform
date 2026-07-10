const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const DOCS_DIR = path.join(__dirname, "../../documents");
const COLLECTION_NAME = "legal_documents";

// Lazy ChromaDB client — only connect when actually needed
const getChromaClient = () => {
  const { ChromaClient } = require("chromadb");
  return new ChromaClient({
    host: "localhost",
    port: 8002, // ChromaDB default port, separate from our backend
  });
};

const chunkText = (text, size = 800, overlap = 100) => {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
};

const indexDocuments = async () => {
  try {
    const chroma = getChromaClient();
    const collection = await chroma.getOrCreateCollection({ name: COLLECTION_NAME });
    const existing = await collection.count();
    if (existing > 0) {
      console.log(`✅ RAG: ${existing} chunks already indexed`);
      return;
    }

    const pdfFiles = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".pdf"));
    if (pdfFiles.length === 0) {
      console.log("⚠️  RAG: No PDFs found in documents folder");
      return;
    }

    let pdfParse;
    try { pdfParse = require("pdf-parse"); } catch {
      console.log("⚠️  RAG: pdf-parse not installed, skipping indexing");
      return;
    }

    let allChunks = [], allIds = [], allMeta = [];
    for (const file of pdfFiles) {
      const buffer = fs.readFileSync(path.join(DOCS_DIR, file));
      const data = await pdfParse(buffer);
      const chunks = chunkText(data.text);
      chunks.forEach((chunk, i) => {
        allChunks.push(chunk);
        allIds.push(`${file}-${i}`);
        allMeta.push({ source: file, chunk: i });
      });
    }

    const embeddings = [];
    for (let i = 0; i < allChunks.length; i += 50) {
      const batch = allChunks.slice(i, i + 50);
      const results = await Promise.all(
        batch.map((text) =>
          genai.models.embedContent({ model: "gemini-embedding-001", contents: text })
            .then((r) => r.embeddings[0].values)
        )
      );
      embeddings.push(...results);
    }

    await collection.add({ ids: allIds, embeddings, documents: allChunks, metadatas: allMeta });
    console.log(`✅ RAG: Indexed ${allChunks.length} chunks from ${pdfFiles.length} documents`);
  } catch (err) {
    // Don't crash the server — RAG is optional
    console.log("⚠️  RAG: ChromaDB not available, skipping indexing:", err.message.slice(0, 80));
  }
};

const queryLegalDocuments = async (question) => {
  try {
    const chroma = getChromaClient();
    const collection = await chroma.getCollection({ name: COLLECTION_NAME });
    const count = await collection.count();
    if (count === 0) {
      return "Legal documents have not been indexed yet. Please contact the administrator.";
    }

    const queryEmbedding = await genai.models.embedContent({
      model: "gemini-embedding-001",
      contents: question,
    });

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding.embeddings[0].values],
      nResults: 5,
    });

    const context = results.documents[0].join("\n\n---\n\n");
    if (!context.trim()) return "Information not found in uploaded legal documents.";

    const prompt = `You are a legal assistant for Indian law enforcement. Answer the question using ONLY the provided legal document excerpts. If the answer is not in the documents, say exactly: "Information not found in uploaded legal documents."

Legal Document Excerpts:
${context}

Question: ${question}

Answer:`;

    const result = await genai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    return result.text;
  } catch (err) {
    // Fallback to direct Gemini when ChromaDB is unavailable
    console.log("⚠️  RAG: ChromaDB unavailable, using direct Gemini:", err.message.slice(0, 60));
    try {
      const result = await genai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `You are a legal assistant for Indian law enforcement (IPC, BNS, BNSS, Evidence Act). Answer this question: ${question}`,
      });
      return result.text;
    } catch {
      return "Information not found in uploaded legal documents.";
    }
  }
};

module.exports = { indexDocuments, queryLegalDocuments };

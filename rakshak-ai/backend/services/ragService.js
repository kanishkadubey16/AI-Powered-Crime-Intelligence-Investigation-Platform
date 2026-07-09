const { GoogleGenerativeAI } = require("@google/genai");
const { ChromaClient } = require("chromadb");
const fs = require("fs");
const path = require("path");

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chroma = new ChromaClient({ path: "http://localhost:8001" });

const COLLECTION_NAME = "legal_documents";
const DOCS_DIR = path.join(__dirname, "../../documents");

// Simple text chunker
const chunkText = (text, size = 800, overlap = 100) => {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
};

// Load and index all PDFs from documents folder
const indexDocuments = async () => {
  try {
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

    // Use pdf-parse if available, otherwise skip
    let pdfParse;
    try { pdfParse = require("pdf-parse"); } catch { 
      console.log("⚠️  RAG: pdf-parse not installed, skipping indexing");
      return;
    }

    const model = genai.getGenerativeModel({ model: "text-embedding-004" });
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

    // Embed in batches of 50
    const embeddings = [];
    for (let i = 0; i < allChunks.length; i += 50) {
      const batch = allChunks.slice(i, i + 50);
      const results = await Promise.all(
        batch.map((text) => model.embedContent(text).then((r) => r.embedding.values))
      );
      embeddings.push(...results);
    }

    await collection.add({ ids: allIds, embeddings, documents: allChunks, metadatas: allMeta });
    console.log(`✅ RAG: Indexed ${allChunks.length} chunks from ${pdfFiles.length} documents`);
  } catch (err) {
    console.error("RAG indexing error:", err.message);
  }
};

// Query the RAG system
const queryLegalDocuments = async (question) => {
  try {
    const collection = await chroma.getCollection({ name: COLLECTION_NAME });
    const count = await collection.count();
    if (count === 0) {
      return "Legal documents have not been indexed yet. Please contact the administrator.";
    }

    const embedModel = genai.getGenerativeModel({ model: "text-embedding-004" });
    const queryEmbedding = await embedModel.embedContent(question);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding.embedding.values],
      nResults: 5,
    });

    const context = results.documents[0].join("\n\n---\n\n");
    if (!context.trim()) {
      return "Information not found in uploaded legal documents.";
    }

    const chatModel = genai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a legal assistant for Indian law enforcement. Answer the question using ONLY the provided legal document excerpts. If the answer is not in the documents, say exactly: "Information not found in uploaded legal documents."

Legal Document Excerpts:
${context}

Question: ${question}

Answer:`;

    const result = await chatModel.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("RAG query error:", err.message);
    return "Information not found in uploaded legal documents.";
  }
};

module.exports = { indexDocuments, queryLegalDocuments };

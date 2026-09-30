import re
import os

with open("rag/rag_chain.py", "r") as f:
    content = f.read()

# 1. Add new Prompts
PROMPTS = """
GENERAL_SYSTEM_PROMPT = (
    "You are Rakshak AI, an intelligent assistant. Answer the user's question clearly, concisely, and accurately.\\n"
    "Do NOT output any thinking, reasoning, internal logs, or section headers unless relevant to the user's query."
)

PROMPT_DEFINITION = (
    "You are Rakshak AI, an AI Legal Assistant for Indian Police Officers.\\n\\n"
    "Your job is to explain the definition of the requested legal offence/concept using the retrieved legal context.\\n\\n"
    "STRICT RULES:\\n"
    "1. Never copy punishment text. Never mention the punishment or penalty.\\n"
    "2. Summarize what the offence means in plain English.\\n"
    "3. Return ONLY the following structured response:\\n\\n"
    "OUTPUT FORMAT:\\n"
    "Definition:\\n"
    "<Summarize the legal definition in plain English.>\\n\\n"
    "Applicable Section:\\n"
    "<Section number and Act name>\\n\\n"
    "Source:\\n"
    "<Document Name>"
)

PROMPT_PUNISHMENT = (
    "You are Rakshak AI, an AI Legal Assistant for Indian Police Officers.\\n\\n"
    "Your job is to explain the punishment for the requested legal offence using the retrieved legal context.\\n\\n"
    "STRICT RULES:\\n"
    "1. Never explain the definition of the offence. Only explain the punishment.\\n"
    "2. Summarize the punishment in plain English.\\n"
    "3. Return ONLY the following structured response:\\n\\n"
    "OUTPUT FORMAT:\\n"
    "Punishment:\\n"
    "<Summarize the punishment details in plain English.>\\n\\n"
    "Applicable Section:\\n"
    "<Section number and Act name>\\n\\n"
    "Source:\\n"
    "<Document Name>"
)

PROMPT_SECTION_LOOKUP = (
    "You are Rakshak AI, an AI Legal Assistant for Indian Police Officers.\\n\\n"
    "Your job is to explain the requested legal section using the retrieved legal context.\\n\\n"
    "STRICT RULES:\\n"
    "1. Provide a brief summary of the section.\\n"
    "2. Provide the exact text of the section.\\n"
    "3. Return ONLY the following structured response:\\n\\n"
    "OUTPUT FORMAT:\\n"
    "Section Summary:\\n"
    "<Summarize the section in plain English.>\\n\\n"
    "Section Text:\\n"
    "<Exact text of the section.>\\n\\n"
    "Source:\\n"
    "<Document Name>"
)

PROMPT_PROCEDURE = (
    "You are Rakshak AI, an AI Legal Assistant for Indian Police Officers.\\n\\n"
    "Your job is to explain the requested legal procedure using the retrieved legal context.\\n\\n"
    "STRICT RULES:\\n"
    "1. Provide a step-by-step procedural explanation.\\n"
    "2. Do not copy large statutory paragraphs verbatim.\\n"
    "3. Return ONLY the following structured response:\\n\\n"
    "OUTPUT FORMAT:\\n"
    "Procedural Steps:\\n"
    "<Step-by-step procedure.>\\n\\n"
    "Applicable Section:\\n"
    "<Section number and Act name (if available)>\\n\\n"
    "Source:\\n"
    "<Document Name>"
)

INTENT_PROMPTS = {
    "DEFINITION": PROMPT_DEFINITION,
    "PUNISHMENT": PROMPT_PUNISHMENT,
    "SECTION_LOOKUP": PROMPT_SECTION_LOOKUP,
    "PROCEDURE": PROMPT_PROCEDURE,
    "GENERAL_LEGAL": PROMPT_DEFINITION
}
"""

# Replace old SYSTEM_PROMPT definitions
content = re.sub(r'GENERAL_SYSTEM_PROMPT = \([\s\S]*?SYSTEM_PROMPT = \([\s\S]*?"<Document Name \+ Section Number.>"\n\)', PROMPTS, content)

# 2. Update answer_question
NEW_ANSWER_QUESTION = """
def answer_question(question, case_data=None, evidence_data=None, fir_summary=None):
    \"\"\"Process a question through Intent Detection and Hybrid RAG/LLM pipeline.\"\"\"
    _log(f"[RAG] Received question: {question}")

    try:
        # Step 1: Detect Intent
        intent = classify_intent(question)
        _log(f"[RAG] Detected Intent: {intent}")

        if intent == "GENERAL":
            _log("[RAG] Non-legal query. Skipping RAG, routing directly to Ollama.")
            user_prompt = f"Question: {question}\\n\\nProvide a direct, friendly, and helpful response."
            raw_answer = _call_llm(GENERAL_SYSTEM_PROMPT, user_prompt, is_general=True)
            final_answer = _strip_leakage(raw_answer).strip()
            if not final_answer:
                final_answer = "No response generated."
            return {"answer": final_answer, "sources": []}

        # Step 2: Retrieve context
        _log("[RAG] Loading vector DB...")
        _log("[RAG] Retriever initialized")
        _log("[RAG] Searching vectors...")
        try:
            relevant_chunks = retrieve_relevant_chunks(question)
            if relevant_chunks is None:
                relevant_chunks = []
        except Exception as e:
            import traceback
            _log("="*80)
            _log("FULL PYTHON TRACEBACK (retrieve_relevant_chunks)")
            _log(traceback.format_exc())
            _log("="*80)
            relevant_chunks = []

        # Handle ambiguous Section Lookup
        if relevant_chunks and isinstance(relevant_chunks[0], dict) and relevant_chunks[0].get("ambiguous"):
            ambig = relevant_chunks[0]
            acts = ", ".join(ambig["sources"])
            return {
                "answer": f"Do you mean Section {ambig['section']} of {acts}, or another Act?",
                "sources": []
            }

        _log(f"[RAG] Chunks found: {len(relevant_chunks)}")
        if relevant_chunks:
            _log(f"[RAG] Chunk metadata: {relevant_chunks[0].metadata}")

        from prompt import format_context_with_sources
        context = format_context_with_sources(relevant_chunks) if relevant_chunks else ""

        sources = []
        
        if context and len(relevant_chunks) > 0:
            user_prompt = f"Question:\\n{question}\\n\\nRetrieved Legal Context:\\n{context}"
            system_prompt = INTENT_PROMPTS.get(intent, INTENT_PROMPTS["GENERAL_LEGAL"])
            
            _log(f"[RAG] Prompt length: {len(user_prompt)}")
            _log("[RAG] Calling Ollama...")
            answer = _call_llm(system_prompt, user_prompt, intent=intent)
            _log("[RAG] Cleaning response")
            
            seen_sources = set()
            for chunk in relevant_chunks:
                src = chunk.metadata.get("source", "Unknown")
                page = chunk.metadata.get("page", "N/A")
                sec = chunk.metadata.get("section_number", "")
                key = (src, page, sec)
                if key not in seen_sources:
                    sources.append({"source": src, "page": page, "section": sec})
                    seen_sources.add(key)

            final_answer = _strip_leakage(answer).strip()

        else:
            _log("[RAG] No relevant document chunks found. Falling back to Ollama general legal knowledge.")
            fallback_prompt = f"Question: {question}\\n\\nExplain this legal topic using your general knowledge of Indian Law."
            system_prompt = INTENT_PROMPTS.get(intent, INTENT_PROMPTS["GENERAL_LEGAL"])
            
            _log(f"[RAG] Prompt length: {len(fallback_prompt)}")
            _log("[RAG] Calling Ollama...")
            raw_answer = _call_llm(system_prompt, fallback_prompt, intent=intent)
            _log("[RAG] Cleaning response")
            final_answer = _strip_leakage(raw_answer).strip()

            disclaimer = "\\n\\nNote:\\nThis response is based on the AI model's general knowledge because no relevant legal document was found."
            if disclaimer not in final_answer:
                final_answer += disclaimer

            sources = [{"source": "AI General Knowledge", "page": "N/A"}]

        if not final_answer:
            final_answer = "No response generated."
            sources = []

        _log("[RAG] Returning JSON")
        return {"answer": final_answer, "sources": sources}
    except Exception as e:
        import traceback
        _log("="*80)
        _log("FULL PYTHON TRACEBACK in answer_question")
        _log(traceback.format_exc())
        _log("="*80)
        raise
"""

content = re.sub(r'def answer_question\([\s\S]*?raise\n', NEW_ANSWER_QUESTION, content)

# 3. Update extraction and validation logic to be intent-aware
# In _call_llm, pass intent
content = content.replace("def _call_llm(system_prompt, user_prompt, is_general=False):", "def _call_llm(system_prompt, user_prompt, is_general=False, intent=None):")
content = content.replace("ans = _call_ollama(system_prompt, user_prompt, max_retries=1, is_general=is_general)", "ans = _call_ollama(system_prompt, user_prompt, max_retries=1, is_general=is_general, intent=intent)")
content = content.replace("ans and _is_valid_answer(ans):", "ans and _is_valid_answer(ans, intent):")
content = content.replace("def _call_ollama(system_prompt, user_prompt, max_retries=2, is_general=False):", "def _call_ollama(system_prompt, user_prompt, max_retries=2, is_general=False, intent=None):")
content = content.replace("cleaned = _extract_final_answer(raw)", "cleaned = _extract_final_answer(raw, intent)")
content = content.replace("if _is_valid_answer(cleaned):", "if _is_valid_answer(cleaned, intent):")
content = content.replace("if _is_valid_answer(stripped):", "if _is_valid_answer(stripped, intent):")

# Update extract_final_answer
NEW_EXTRACT = """
def _extract_final_answer(text, intent=None):
    text = _strip_leakage(text)
    if not text:
        return ""
    
    # Very permissive extraction, just strip out thinking blocks
    lines = text.splitlines()
    cleaned = []
    in_think = False
    for line in lines:
        if "<think>" in line or "Thinking Process" in line:
            in_think = True
        if "</think>" in line:
            in_think = False
            continue
        if not in_think:
            cleaned.append(line)
            
    return "\\n".join(cleaned).strip()

def _is_valid_answer(answer, intent=None):
    if not answer or len(answer) < 20: return False
    
    lower = answer.lower()
    if any(token in lower for token in ("thinking process", "<think>", "let me ", "i need to")):
        return False
        
    if intent == "DEFINITION" and "definition:" not in lower: return False
    if intent == "PUNISHMENT" and "punishment:" not in lower: return False
    if intent == "SECTION_LOOKUP" and "section text:" not in lower: return False
    if intent == "PROCEDURE" and "procedural steps:" not in lower: return False
        
    return True
"""
content = re.sub(r'def _extract_final_answer[\s\S]*?def _extract_section_numbers', NEW_EXTRACT + "\\ndef _extract_section_numbers", content)

with open("rag/rag_chain.py", "w") as f:
    f.write(content)
print("rag_chain.py updated!")

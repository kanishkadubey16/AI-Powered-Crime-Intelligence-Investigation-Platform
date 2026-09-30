"""
retriever.py — Three-stage hybrid retrieval for Rakshak AI.

Stage 1:  Exact metadata match (section_number + act) — HIGHEST PRIORITY
Stage 2:  BM25 keyword search (ranked TF-IDF style overlap)
Stage 3:  ChromaDB cosine-similarity retrieval + CrossEncoder reranking

Debug logs are printed for every chunk at each stage.
"""

import re
import math
from collections import Counter

try:
    from .config import TOP_K, TOP_K_AFTER_RERANK, RERANKER_MODEL
    from .vectordb import ensure_vector_store, get_vector_store
except ImportError:
    from config import TOP_K, TOP_K_AFTER_RERANK, RERANKER_MODEL
    from vectordb import ensure_vector_store, get_vector_store



def _log(*args, **kwargs):
    try:
        print(*args, **kwargs)
    except BrokenPipeError:
        pass


# ── CrossEncoder (lazy-loaded, cached) ────────────────────────────────────────
_RERANKER = None


def _get_reranker():
    """Load CrossEncoder once and cache it."""
    global _RERANKER
    if _RERANKER is None:
        try:
            from sentence_transformers import CrossEncoder
            _RERANKER = CrossEncoder(RERANKER_MODEL)
            _log(f"[Reranker] Loaded model: {RERANKER_MODEL}")
        except Exception as e:
            _log(f"[Reranker] WARNING — could not load CrossEncoder: {e}")
            _RERANKER = None
    return _RERANKER


def _chunk_preview(text: str, chars: int = 200) -> str:
    """Return a short preview of chunk text for logging."""
    preview = re.sub(r"\s+", " ", text).strip()
    return preview[:chars] + ("…" if len(preview) > chars else "")


def _log_chunk(idx: int, chunk, score=None, stage: str = "retrieved"):
    """Print a structured debug log line for one chunk."""
    meta = chunk.metadata
    sec_num   = meta.get("section_number", "—")
    sec_title = meta.get("section_title", "")
    source    = meta.get("source", "unknown")
    page      = meta.get("page", "?")
    preview   = _chunk_preview(chunk.page_content)
    score_str = f"  score={score:.4f}" if score is not None else ""
    _log(
        f"  [{stage}] chunk={idx+1:<2}{score_str}\n"
        f"    section={sec_num}  title={sec_title!r}\n"
        f"    source={source}  page={page}\n"
        f"    preview: {preview}\n"
    )


# ── Stage 0: All-chunks lazy cache with tokenized index for BM25 ─────────────
_ALL_CHUNKS_CACHE = None
_ALL_CHUNKS_TOKENS = None
_IDF_CACHE = None


def _build_bm25_index(question: str = None):
    """Build (once) and cache a BM25-ready inverted index over all stored chunks."""
    global _ALL_CHUNKS_CACHE, _ALL_CHUNKS_TOKENS, _IDF_CACHE
    if _ALL_CHUNKS_CACHE is not None:
        return

    from langchain_core.documents import Document
    store = get_vector_store()
    raw = store.get(include=["documents", "metadatas"])
    docs, metas = raw["documents"], raw["metadatas"]
    chunks = []
    tokenized = []
    for doc, meta in zip(docs, metas):
        if not doc:
            continue
        chunks.append(Document(page_content=doc, metadata=meta))
        tokens = re.findall(r"[a-z0-9]+", doc.lower())
        tokenized.append(tokens)

    _ALL_CHUNKS_CACHE = chunks
    _ALL_CHUNKS_TOKENS = tokenized

    N = len(tokenized)
    df = Counter()
    for toks in tokenized:
        for t in set(toks):
            df[t] += 1
    _IDF_CACHE = {t: math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5)) for t in df}


def _bm25_score_chunk(q_tokens: list, chunk_tokens: list, avgdl: float, k1: float = 1.5, b: float = 0.75) -> float:
    """BM25 Okapi score for one chunk."""
    score = 0.0
    dl = len(chunk_tokens)
    tf = Counter(chunk_tokens)
    for qt in set(q_tokens):
        if qt not in _IDF_CACHE:
            continue
        idf = _IDF_CACHE[qt]
        f = tf.get(qt, 0)
        if f == 0:
            continue
        numerator = f * (k1 + 1)
        denominator = f + k1 * (1 - b + b * (dl / avgdl if avgdl > 0 else 1))
        score += idf * (numerator / denominator)
    return score


def _stage_bm25(question: str, k: int = 20) -> list:
    """Stage 2: BM25 keyword search — returns top-k (chunk, score) pairs."""
    _build_bm25_index()
    q_tokens = re.findall(r"[a-z0-9]+", question.lower())
    if not q_tokens or not _ALL_CHUNKS_TOKENS:
        return []

    # Boost metadata section/title keywords by adding them to the query
    sec_match = re.search(r"\b(?:section|sec\.?|article|art\.?)\s*(\d{1,4}[a-z]?)\b", question.lower())
    if sec_match:
        q_tokens = q_tokens + [sec_match.group(1)] * 5  # weight section number heavily

    all_tok = _ALL_CHUNKS_TOKENS
    avgdl = sum(len(t) for t in all_tok) / max(1, len(all_tok))

    scored = []
    for i, tok in enumerate(all_tok):
        s = _bm25_score_chunk(q_tokens, tok, avgdl)
        if s > 0:
            scored.append((_ALL_CHUNKS_CACHE[i], s))
    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:k]
    _log(f"\n[Retriever] ── Stage 2: BM25 keyword search (top {len(top)}) ──")
    for i, (c, s) in enumerate(top[:10]):
        _log_chunk(i, c, score=float(s), stage="bm25")
    return top


# ── Stage 1: ChromaDB retrieval ───────────────────────────────────────────────

def _stage1_retrieve(question: str):
    """Stage 3 (after metadata+BM25): ChromaDB cosine similarity candidates."""
    _log(f"\n[Retriever] ── Stage 3: ChromaDB cosine similarity (top {TOP_K}) ──")
    ensure_vector_store()
    store = get_vector_store()

    results = store.similarity_search_with_score(question, k=TOP_K)

    chunks_with_scores = []
    for i, (chunk, raw_score) in enumerate(results):
        similarity = 1.0 / (1.0 + raw_score)
        _log_chunk(i, chunk, score=similarity, stage="stage1")
        chunks_with_scores.append((chunk, similarity))

    return chunks_with_scores


# ── Stage 4: CrossEncoder reranking ──────────────────────────────────────────

def _stage_rerank(question: str, chunks_with_scores: list, top_k_override: int | None = None):
    """Rerank candidates with CrossEncoder; keep top TOP_K_AFTER_RERANK (or override)."""
    reranker = _get_reranker()
    effective_k = top_k_override if top_k_override else TOP_K_AFTER_RERANK

    if reranker is None:
        _log("[Reranker] Skipping reranking — CrossEncoder unavailable.")
        top = sorted(chunks_with_scores, key=lambda x: x[1], reverse=True)
        return [c for c, _ in top[:effective_k]]

    _log(f"\n[Retriever] ── Stage 4: CrossEncoder reranking (keep top {effective_k}) ──")
    chunks = [c for c, _ in chunks_with_scores]
    pairs = [[question, c.page_content] for c in chunks]

    try:
        ce_scores = reranker.predict(pairs)
    except Exception as e:
        _log(f"[Reranker] predict() failed: {e} — falling back to cosine order.")
        return [c for c, _ in chunks_with_scores[:effective_k]]

    ranked = sorted(zip(chunks, ce_scores), key=lambda x: x[1], reverse=True)

    _log(f"\n[Retriever] ── Final chunks after reranking ──")
    final_chunks = []
    for i, (chunk, ce_score) in enumerate(ranked[:effective_k]):
        _log_chunk(i, chunk, score=float(ce_score), stage="reranked")
        final_chunks.append(chunk)

    return final_chunks


# ── Public API ────────────────────────────────────────────────────────────────

def retrieve_relevant_chunks(question: str, intent: str | None = None) -> list:
    """
    Hybrid Section-Accurate Retrieval (4-stage):
      1. Explicit Section / Act metadata lookup (HIGHEST PRIORITY).
         Disambiguate Offence + Punishment / Definition via curated map.
      2. BM25 keyword search over all indexed chunks.
      3. ChromaDB vector cosine-similarity.
      4. CrossEncoder reranking on merged candidate pool.
    Returns list of Document objects (top TOP_K_AFTER_RERANK).
    If section lookup is ambiguous across Acts, returns one-element dict {"ambiguous": True, ...}.
    """
    _log(f"\n[Retriever] Processing question: {question!r}  (intent={intent!r})")
    q_lower = question.lower()
    store = get_vector_store()
    from langchain_core.documents import Document

    boosted_doc = None
    explicit_sec = None

    # ── Step 1: Explicit Section / Article Number Matcher ───────────────────
    sec_match = re.search(r"\b(?:section|sec\.?|article|art\.?)\s*(\d{1,4}[a-z]?)\b", q_lower)
    if sec_match:
        explicit_sec = sec_match.group(1)
        _log(f"[Retriever] Explicit section/article requested: {explicit_sec}")

    act_match = re.search(r"\b(bns|bnss|bsa|ipc|crpc|constitution|coi|evidence)\b", q_lower)
    explicit_act = act_match.group(1).lower() if act_match else None
    if explicit_act == "coi" or explicit_act == "constitution":
        explicit_act = "coi"
    if explicit_act == "evidence" or explicit_act == "ipc" or explicit_act == "crpc":
        pass  # leave as-is for act normalisation below

    _log(f"[Retriever] Explicit act filter: {explicit_act!r}")

    # ── Step 2: Offence & Intent Disambiguation Mapping ─────────────────────
    is_punishment = bool(re.search(r"\b(punishment|penalty|sentence|imprisonment|jail|fine)\b", q_lower))
    is_short_def = bool(re.search(r"\b(short\s+(definition|answer|explanation)|brief|summarize|summarise|in\s+short)\b", q_lower))
    is_scenario = (intent == "SCENARIO") if intent else False

    # Curated topic → (section_number, source_pdf) for both DEFINITION and PUNISHMENT intents
    # Keys use lowercase; \b boundaries applied at match time. Also include verb tenses.
    punishment_sec_map = {
        "attempt to murder": ("109", "BNS.pdf"),
        "attempted murder": ("109", "BNS.pdf"),
        "culpable homicide": ("105", "BNS.pdf"),
        "murder": ("103", "BNS.pdf"),
        "murdered": ("103", "BNS.pdf"),
        "killed": ("103", "BNS.pdf"),
        "robbery": ("311", "BNS.pdf"),
        "theft": ("305", "BNS.pdf"),
        "stole": ("305", "BNS.pdf"),
        "stolen": ("305", "BNS.pdf"),
        "steals": ("305", "BNS.pdf"),
        "dacoity": ("310", "BNS.pdf"),
        "assault": ("131", "BNS.pdf"),
        "assaulted": ("131", "BNS.pdf"),
        "slap": ("131", "BNS.pdf"),
        "slaps": ("131", "BNS.pdf"),
        "slapped": ("131", "BNS.pdf"),
        "hit": ("131", "BNS.pdf"),
        "hits": ("131", "BNS.pdf"),
        "punched": ("131", "BNS.pdf"),
        "criminal force": ("131", "BNS.pdf"),
        "cheating": ("320", "BNS.pdf"),
        "cheats": ("320", "BNS.pdf"),
        "cheated": ("320", "BNS.pdf"),
        "deceived": ("320", "BNS.pdf"),
        "fraud": ("320", "BNS.pdf"),
        "defrauded": ("320", "BNS.pdf"),
        "cheating by personation": ("319", "BNS.pdf"),
        "extortion": ("308", "BNS.pdf"),
        "kidnapping": ("140", "BNS.pdf"),
        "kidnaps": ("140", "BNS.pdf"),
        "kidnapped": ("140", "BNS.pdf"),
        "abduction": ("140", "BNS.pdf"),
        "abducts": ("140", "BNS.pdf"),
        "abducted": ("140", "BNS.pdf"),
        "forgery": ("336", "BNS.pdf"),
        "forges": ("336", "BNS.pdf"),
        "forged": ("336", "BNS.pdf"),
        "forge": ("336", "BNS.pdf"),
        "signature": ("336", "BNS.pdf"),
        "false document": ("336", "BNS.pdf"),
        "forged document": ("340", "BNS.pdf"),
        "counterfeit": ("336", "BNS.pdf"),
        "mischief": ("325", "BNS.pdf"),
        "criminal intimidation": ("351", "BNS.pdf"),
        "wrongful restraint": ("126", "BNS.pdf"),
        "wrongful confinement": ("128", "BNS.pdf"),
    }
    definition_sec_map = {
        "attempt to murder": ("109", "BNS.pdf"),
        "attempted murder": ("109", "BNS.pdf"),
        "culpable homicide": ("100", "BNS.pdf"),
        "murder": ("101", "BNS.pdf"),
        "murdered": ("101", "BNS.pdf"),
        "killed": ("101", "BNS.pdf"),
        "robbery": ("309", "BNS.pdf"),
        "theft": ("303", "BNS.pdf"),
        "stole": ("303", "BNS.pdf"),
        "stolen": ("303", "BNS.pdf"),
        "steals": ("303", "BNS.pdf"),
        "dacoity": ("310", "BNS.pdf"),
        "assault": ("130", "BNS.pdf"),
        "assaulted": ("130", "BNS.pdf"),
        "slap": ("130", "BNS.pdf"),
        "slaps": ("130", "BNS.pdf"),
        "slapped": ("130", "BNS.pdf"),
        "hit": ("130", "BNS.pdf"),
        "hits": ("130", "BNS.pdf"),
        "punched": ("130", "BNS.pdf"),
        "criminal force": ("130", "BNS.pdf"),
        "cheating": ("318", "BNS.pdf"),
        "cheats": ("318", "BNS.pdf"),
        "cheated": ("318", "BNS.pdf"),
        "deceived": ("318", "BNS.pdf"),
        "fraud": ("318", "BNS.pdf"),
        "defrauded": ("318", "BNS.pdf"),
        "cheating by personation": ("319", "BNS.pdf"),
        "extortion": ("308", "BNS.pdf"),
        "kidnapping": ("137", "BNS.pdf"),
        "kidnaps": ("137", "BNS.pdf"),
        "kidnapped": ("137", "BNS.pdf"),
        "abduction": ("138", "BNS.pdf"),
        "abducts": ("138", "BNS.pdf"),
        "abducted": ("138", "BNS.pdf"),
        "forgery": ("336", "BNS.pdf"),
        "forges": ("336", "BNS.pdf"),
        "forged": ("336", "BNS.pdf"),
        "forge": ("336", "BNS.pdf"),
        "signature": ("336", "BNS.pdf"),
        "false document": ("335", "BNS.pdf"),
        "forged document": ("340", "BNS.pdf"),
        "counterfeit": ("336", "BNS.pdf"),
        "signature forgery": ("336", "BNS.pdf"),
        "forges a signature": ("336", "BNS.pdf"),
        "mischief": ("324", "BNS.pdf"),
        "criminal intimidation": ("351", "BNS.pdf"),
        "wrongful restraint": ("126", "BNS.pdf"),
        "wrongful confinement": ("128", "BNS.pdf"),
        "crime": ("2", "BNS.pdf"),
        "offence": ("2", "BNS.pdf"),
        "information in cognizable cases": ("173", "BNSS.pdf"),
        "cognizable cases": ("173", "BNSS.pdf"),
        "cognizable": ("173", "BNSS.pdf"),
    }

    topic_sec_map = punishment_sec_map if is_punishment else definition_sec_map
    _log(f"[Retriever] Intent punishment={is_punishment}, scenario={is_scenario}, short_def={is_short_def}")

    target_sec = explicit_sec
    target_src = None
    # For SCENARIO, DEFINITION, PUNISHMENT, GENERAL_LEGAL intents, also pre-fetch
    # the complementary def/punishment section alongside the primary match.
    extra_targets: list[tuple[str, str]] = []  # (sec, src)

    # Curated companion pairs (offence definition <-> punishment).
    # When one side is topic-matched, automatically also pull the other side.
    COMPANION_SECTIONS: dict[str, list[tuple[str, str]]] = {
        # definition -> punishment(s)  (BNS.pdf source assumed)
        "101": [("103", "BNS.pdf")],       # Murder def -> Murder punit
        "309": [("311", "BNS.pdf")],       # Robbery def -> Robbery punit
        "318": [("320", "BNS.pdf")],       # Cheating def -> Cheating punit
        "137": [("140", "BNS.pdf")],       # Kidnapping def -> Kidnapping punit
        "138": [("140", "BNS.pdf")],       # Abduction -> Kidnapping/abduction punit
        "130": [("131", "BNS.pdf")],       # Assault def -> Assault punit
        "336": [("335", "BNS.pdf"), ("337", "BNS.pdf"), ("338", "BNS.pdf")],  # Forgery -> FalseDoc / CourtDoc / ValSec
        "335": [("336", "BNS.pdf")],       # FalseDoc -> Forgery
        "324": [("325", "BNS.pdf")],       # Mischief def -> Mischief punit
        # punishment -> definition
        "103": [("101", "BNS.pdf")],
        "311": [("309", "BNS.pdf")],
        "320": [("318", "BNS.pdf")],
        "140": [("137", "BNS.pdf"), ("138", "BNS.pdf")],
        "131": [("130", "BNS.pdf")],
        "325": [("324", "BNS.pdf")],
    }

    if not target_sec:
        sorted_topics = sorted(topic_sec_map.items(), key=lambda x: len(x[0]), reverse=True)
        for keyword, (sec_num, doc_src) in sorted_topics:
            if re.search(rf"\b{re.escape(keyword)}\b", q_lower):
                target_sec = sec_num
                target_src = doc_src
                _log(f"[Retriever] Topic match '{keyword}' (punishment={is_punishment}) -> Section {target_sec} ({target_src})")
                # For most legal intents, also fetch the complementary def/punishment section
                pull_companions = is_scenario or intent in ("DEFINITION", "PUNISHMENT", "GENERAL_LEGAL", None)
                if pull_companions:
                    # First: try same-keyword lookup in opposite map (def <-> punit)
                    other_map = punishment_sec_map if (topic_sec_map is definition_sec_map) else definition_sec_map
                    for kw2, (sec2, src2) in sorted(other_map.items(), key=lambda x: len(x[0]), reverse=True):
                        if re.search(rf"\b{re.escape(kw2)}\b", q_lower) and sec2 != target_sec:
                            extra_targets.append((sec2, src2))
                            _log(f"[Retriever] Companion topic '{kw2}' -> add Section {sec2} ({src2})")
                            break
                    # Second: use curated companion pairs (e.g., 336 forgery also needs 335 false doc)
                    for (sec2, src2) in COMPANION_SECTIONS.get(target_sec, []):
                        if sec2 != target_sec and not any(s == sec2 for s, _ in extra_targets):
                            extra_targets.append((sec2, src2))
                            _log(f"[Retriever] Companion Section {target_sec} -> add Section {sec2} ({src2})")
                break

    # Collect HIGH-PRIORITY metadata-direct sections. These bypass BM25/vector and land first.
    forced_chunks: list = []
    _sections_forced: set = set()  # stores tuples (source, section_number)

    def _add_forced_sec(sec: str, src: str | None):
        if not sec:
            return
        # Short-circuit: if caller specified an exact (src,sec) pair we've already loaded, skip
        if src is not None and (src, sec) in _sections_forced:
            return
        where = {"section_number": str(sec)}
        if src:
            where = {"$and": [{"section_number": str(sec)}, {"source": src}]}
        try:
            r = store.similarity_search(question, k=3, filter=where)
            if r:
                _log(f"[Retriever] Metadata-forced Section {sec} ({src or 'any'}) -> {len(r)} chunk(s) loaded")
                for c in r:
                    key = (c.metadata.get("source"), c.metadata.get("section_number"))
                    if key in _sections_forced:
                        continue
                    forced_chunks.append(c)
                    _sections_forced.add(key)
        except Exception as e_md:
            _log(f"[Retriever] metadata fetch Sec {sec} failed: {e_md}")

    if target_sec:
        if intent == "SECTION_LOOKUP" and explicit_sec:
            # Exact section lookup: one Act only unless user named the Act
            act_src_map = {
                "bns": "BNS.pdf", "bnss": "BNSS.pdf", "bsa": "BSA.pdf", "coi": "coi.pdf",
                "ipc": "BNS.pdf", "crpc": "BNSS.pdf", "evidence": "BSA.pdf",
            }
            lookup_src = act_src_map.get(explicit_act) if explicit_act else "BNS.pdf"
            _add_forced_sec(target_sec, lookup_src)
        else:
            _add_forced_sec(target_sec, target_src if explicit_act or target_src else None)
            # Multi-act section collision only when user did not ask for a single-section lookup
            if explicit_sec and not explicit_act and intent != "SECTION_LOOKUP":
                preferred_order = ["BNS.pdf", "BNSS.pdf", "BSA.pdf", "coi.pdf"]
                for preferred_src in preferred_order:
                    if preferred_src != target_src:
                        _add_forced_sec(explicit_sec, preferred_src)
            pull_companions_explicit = intent in ("DEFINITION", "PUNISHMENT", "GENERAL_LEGAL", "SCENARIO", None)
            if pull_companions_explicit and not (intent == "SECTION_LOOKUP" and explicit_sec):
                for (sec2, src2) in COMPANION_SECTIONS.get(target_sec, []):
                    if sec2 != target_sec and not any(s == sec2 for s, _ in extra_targets):
                        extra_targets.append((sec2, src2))
                        _log(f"[Retriever] Explicit Sec companion {target_sec} -> add Section {sec2} ({src2})")
    # Extra complementary sections (def + punit pairs, companions)
    for sec2, src2 in extra_targets:
        _add_forced_sec(sec2, src2)

    # ── Candidate pool from BM25 + Vector (merge, dedupe by section) ────────
    bm25_candidates = _stage_bm25(question, k=TOP_K)
    vector_candidates = _stage1_retrieve(question)

    # Keyword token overlap boost on top of vector scores (lightweight signal)
    q_tokens = set(re.findall(r"\w+", q_lower))
    for i, (chunk, score) in enumerate(vector_candidates):
        chunk_tokens = set(re.findall(r"\w+", chunk.page_content.lower()))
        overlap = len(q_tokens.intersection(chunk_tokens))
        if overlap > 0:
            vector_candidates[i] = (chunk, min(score + overlap * 0.03, 1.0))

    # Merge + dedupe candidates (HIGHEST PRIORITY first):
    #   Priority 0 = metadata-forced chunks (curated topic hits + scenario extras)
    #   Priority 1 = BM25 keyword search
    #   Priority 2 = vector cosine-similarity
    merged_key = {}  # (source, section_number) -> (chunk, best_score)
    # Priority 0: metadata-forced chunks
    for c in forced_chunks:
        meta = c.metadata
        key = (meta.get("source", ""), meta.get("section_number", id(c)))
        merged_key[key] = (c, 0.99)  # near-perfect score: always survives rerank
    # Priority 1: BM25
    for chunk, s in bm25_candidates:
        meta = chunk.metadata
        key = (meta.get("source", ""), meta.get("section_number", id(chunk)))
        if s <= 0:
            continue
        # Normalise BM25 score into [0,1] region by just keeping its relative weight
        if key not in merged_key:
            merged_key[key] = (chunk, 0.5 + min(s / 20.0, 0.5))
    # Priority 2: vector (may upgrade if score higher than existing)
    for chunk, s in vector_candidates:
        meta = chunk.metadata
        key = (meta.get("source", ""), meta.get("section_number", id(chunk)))
        if key in merged_key:
            existing_chunk, existing_score = merged_key[key]
            if s > existing_score:
                merged_key[key] = (chunk, s)
        else:
            merged_key[key] = (chunk, s)

    merged_scores = list(merged_key.values())
    merged_scores.sort(key=lambda x: x[1], reverse=True)
    _log(f"\n[Retriever] ── Merged candidate pool: {len(merged_scores)} unique sections ──")
    for i, (c, s) in enumerate(merged_scores[:10]):
        _log_chunk(i, c, score=s, stage="merged")

    # ── Direct Metadata Lookup for Target Section ───────────────────────────
    if target_sec:
        try:
            where_clause = {"section_number": str(target_sec)}
            if target_src:
                where_clause = {"$and": [{"section_number": str(target_sec)}, {"source": target_src}]}
            res = store.get(where=where_clause) if target_src else store.get(where={"section_number": str(target_sec)})

            if not res or not res["documents"] or len(res["documents"]) == 0:
                # Try without source filter if explicit source filtered everything
                if target_src and not explicit_act:
                    res = store.get(where={"section_number": str(target_sec)})

            if res and res["documents"] and len(res["documents"]) > 0:
                distinct_sources = set()
                for m in res["metadatas"]:
                    s = m.get("source")
                    if s:
                        distinct_sources.add(s)

                # Ambiguity only when user explicitly typed section number (not topic map)
                # and multiple sources contain it AND no explicit act was given
                if explicit_sec and not explicit_act and len(distinct_sources) > 1:
                    # Smart priority: If BNS.pdf contains the section, prefer it silently
                    # unless section 100-500 range makes it obviously IPC-ish.
                    # If still ambiguous across unrelated acts, ask.
                    preferred_order = ["BNS.pdf", "BNSS.pdf", "BSA.pdf", "coi.pdf"]
                    chosen_src = None
                    for p in preferred_order:
                        if p in distinct_sources:
                            chosen_src = p
                            break
                    # Ambiguity only when 2+ sources exist across penal+procedure domains
                    penal = {"BNS.pdf"}
                    procedure_or_other = distinct_sources - penal
                    if chosen_src and len(distinct_sources) <= 2 and (
                        (penal.intersection(distinct_sources) and procedure_or_other)
                        or True  # always try best-effort disambiguation instead of asking
                    ):
                        # Pick the first preferred source silently.
                        filtered = [(d, m) for d, m in zip(res["documents"], res["metadatas"]) if m.get("source") == chosen_src]
                        if filtered:
                            doc_text, metadata = filtered[0]
                            boosted_doc = Document(page_content=doc_text, metadata=metadata)
                            _log(f"[Retriever] Metadata Hit: Ambiguity resolved preferring {chosen_src} for Section {target_sec}.")
                        else:
                            doc_text = res["documents"][0]
                            metadata = res["metadatas"][0]
                            boosted_doc = Document(page_content=doc_text, metadata=metadata)
                    else:
                        _log(f"[Retriever] Ambiguous section lookup for Section {target_sec}: {distinct_sources}")
                        return [{"ambiguous": True, "section": target_sec, "sources": list(distinct_sources)}]
                else:
                    # If explicit act filter is provided, honour it
                    if explicit_act:
                        target_source_key_map = {
                            "bns": "BNS.pdf", "bnss": "BNSS.pdf", "bsa": "BSA.pdf", "coi": "coi.pdf",
                            "ipc": "BNS.pdf", "crpc": "BNSS.pdf", "evidence": "BSA.pdf",
                        }
                        act_src = target_source_key_map.get(explicit_act, None)
                        if act_src:
                            filtered = [(d, m) for d, m in zip(res["documents"], res["metadatas"]) if m.get("source", "").lower() == act_src.lower()]
                            if filtered:
                                doc_text, metadata = filtered[0]
                            else:
                                doc_text = res["documents"][0]
                                metadata = res["metadatas"][0]
                        else:
                            doc_text = res["documents"][0]
                            metadata = res["metadatas"][0]
                    else:
                        # If target_src from topic map, prefer that
                        if target_src:
                            filtered = [(d, m) for d, m in zip(res["documents"], res["metadatas"]) if m.get("source") == target_src]
                            if filtered:
                                doc_text, metadata = filtered[0]
                            else:
                                doc_text = res["documents"][0]
                                metadata = res["metadatas"][0]
                        else:
                            doc_text = res["documents"][0]
                            metadata = res["metadatas"][0]
                    boosted_doc = Document(page_content=doc_text, metadata=metadata)
                    _log(f"[Retriever] Direct Metadata Hit: Section {target_sec} ({metadata.get('source')}).")
            else:
                _log(f"[Retriever] Section {target_sec} not found via metadata filter.")
        except Exception as e:
            import traceback
            _log(f"[Retriever] Metadata lookup error for Section {target_sec}: {e}")
            _log(traceback.format_exc())

    def _dedupe_chunks(chunks_list):
        out = []
        seen = set()
        for c in chunks_list:
            m = c.metadata
            key = (m.get("source", ""), str(m.get("section_number", "")))
            if key in seen:
                continue
            seen.add(key)
            out.append(c)
        return out

    def _prefer_act(chunks_list, act_pdf="BNS.pdf"):
        act_chunks = [c for c in chunks_list if c.metadata.get("source") == act_pdf]
        return act_chunks if act_chunks else chunks_list

    # Curated metadata hits: skip noisy vector/BM25 padding when we already know the section(s)
    has_curated_hit = bool(forced_chunks or boosted_doc)
    if has_curated_hit and intent in ("DEFINITION", "PUNISHMENT", "SECTION_LOOKUP", "SCENARIO", None):
        final = []
        if boosted_doc:
            final.append(boosted_doc)
        final.extend(forced_chunks)
        final = _dedupe_chunks(final)
        if intent == "SECTION_LOOKUP" and explicit_sec:
            act_src_map = {
                "bns": "BNS.pdf", "bnss": "BNSS.pdf", "bsa": "BSA.pdf", "coi": "coi.pdf",
                "ipc": "BNS.pdf", "crpc": "BNSS.pdf", "evidence": "BSA.pdf",
            }
            want_src = act_src_map.get(explicit_act, "BNS.pdf") if explicit_act else "BNS.pdf"
            final = [c for c in final if c.metadata.get("source") == want_src]
            final = final[:1]
        elif intent == "PUNISHMENT":
            final = _prefer_act(final)[:2]
        elif intent == "DEFINITION":
            final = _prefer_act(final)[:2]
        elif intent == "SCENARIO":
            final = _prefer_act(final)[:3]
        else:
            final = _prefer_act(final)[:2]
    else:
        # ── Stage 4: Reranking on merged candidates ─────────────────────────────
        effective_top_k = max(TOP_K_AFTER_RERANK, 3)
        if merged_scores:
            reranked = _stage_rerank(question, merged_scores, top_k_override=effective_top_k)
        else:
            reranked = []

        final = []
        seen_keys = set()
        if boosted_doc:
            final.append(boosted_doc)
            seen_keys.add((boosted_doc.metadata.get("source", ""), boosted_doc.metadata.get("section_number", "")))
        for c in forced_chunks:
            key = (c.metadata.get("source", ""), c.metadata.get("section_number", ""))
            if key in seen_keys:
                continue
            final.append(c)
            seen_keys.add(key)
        for chunk in reranked:
            key = (chunk.metadata.get("source", ""), chunk.metadata.get("section_number", ""))
            if key in seen_keys:
                continue
            final.append(chunk)
            seen_keys.add(key)
            if len(final) >= effective_top_k:
                break
        final = _dedupe_chunks(_prefer_act(final))[:effective_top_k]

    # ── Print Retrieval Summary Logs ─────────────────────────────────────────
    _log("\n[Retriever] ── Final Retrieved ──")
    for idx, chunk in enumerate(final, start=1):
        sec = chunk.metadata.get("section_number", "N/A")
        src = chunk.metadata.get("source", "?")
        title = chunk.metadata.get("section_title", "")
        # Dummy display score: metadata hit 0.99, else rerank order 0.8→0.2
        score = 0.99 if idx == 1 and boosted_doc else round(0.85 - (idx - 1) * 0.2, 2)
        _log(f"  Chunk {idx}: Section {sec} ({src}) score={score}\n  Title: {title}")

    _log(f"[Retriever] Returning {len(final)} chunk(s) to LLM.\n")
    return final



/**
 * Mock AI Provider - Returns realistic deterministic responses
 * Used as fallback when primary providers fail
 */

const CRIME_TYPES = ["theft", "assault", "fraud", "murder", "cybercrime", "kidnapping", "other"];
const PRIORITIES = ["low", "medium", "high", "critical"];
const RISK_LEVELS = ["low", "medium", "high", "critical"];
const SUSPECT_STATUSES = ["wanted", "arrested", "released", "unknown"];

// Simple hash function for deterministic responses
const _hash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const _pick = (arr, seed) => arr[seed % arr.length];
const _pickMultiple = (arr, count, seed) => {
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(arr[(seed + i) % arr.length]);
  }
  return result;
};

const _extractKeywords = (text) => {
  const keywords = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  return [...new Set(keywords)].slice(0, 5);
};

const _detectCrimeType = (text) => {
  const t = text.toLowerCase();
  if (t.includes("kill") || t.includes("murder") || t.includes("death")) return "murder";
  if (t.includes("steal") || t.includes("theft") || t.includes("rob")) return "theft";
  if (t.includes("attack") || t.includes("hurt") || t.includes("injure")) return "assault";
  if (t.includes("fraud") || t.includes("cheat") || t.includes("scam")) return "fraud";
  if (t.includes("cyber") || t.includes("hack") || t.includes("online")) return "cybercrime";
  if (t.includes("kidnap") || t.includes("abduct")) return "kidnapping";
  return "other";
};

const analyzeFIR = async (firText) => {
  // Use text hash for deterministic but varied responses
  const seed = _hash(firText);
  const keywords = _extractKeywords(firText);
  const detectedType = _detectCrimeType(firText);

  const crimeType = detectedType;
  const priority = _pick(PRIORITIES, seed);
  const riskLevel = _pick(RISK_LEVELS, seed + 1);

  // Generate suspects based on keywords
  const suspectCount = (seed % 3) + 1;
  const suspects = Array.from({ length: suspectCount }, (_, i) => ({
    name: `Suspect ${String.fromCharCode(65 + ((seed + i) % 26))}`,
    description: keywords.length > 0 
      ? `Individual possibly involved in incident. Known keywords: ${keywords.slice(0, 3).join(", ")}`
      : "Individual requiring further investigation",
    status: _pick(SUSPECT_STATUSES, seed + i),
  }));

  // Generate victims
  const victimCount = (seed % 2) + 1;
  const victims = Array.from({ length: victimCount }, (_, i) => ({
    name: `Victim ${i + 1}`,
    age: (seed % 50) + 18,
    description: keywords.length > 0 
      ? `Person affected by incident. Related terms: ${keywords.slice(0, 2).join(", ")}`
      : "Person requiring victim support services",
  }));

  return {
    summary: `Investigation initiated based on reported incident. ${crimeType.toUpperCase()} case filed for further inquiry. Evidence and witness statements to be collected from the location.`,
    crimeCategory: crimeType,
    priority: priority,
    riskLevel: riskLevel,
    victims,
    suspects,
    locations: keywords.filter(k => 
      ["street", "road", "area", "market", "home", "office", "store", "bank"].some(p => k.includes(p))
    ).length > 0 
      ? [keywords.filter(k => ["street", "road", "area", "market", "home", "office", "store", "bank"].some(p => k.includes(p)))[0] || "Location to be verified"]
      : ["Location to be verified from FIR"],
    importantDates: ["Incident date to be confirmed from FIR"],
    evidenceMentioned: ["Physical evidence collection pending", "CCTV footage retrieval required"],
    possibleMotive: `Financial gain suspected in ${crimeType} case. Further investigation needed to confirm.`,
    investigationSteps: [
      "Visit incident location and document evidence",
      "Collect initial statements from complainant and witnesses",
      "Secure any available CCTV footage",
      "Register formal case and assign investigating officer",
      "Prepare and submit investigation report",
    ],
  };
};

const generateInvestigationReport = async (caseData) => {
  const seed = _hash(caseData.caseNumber || caseData.title || "default");
  const type = caseData.type || "other";
  const priority = caseData.priority || "medium";

  return `===============================================
         INVESTIGATION REPORT
         Case: ${caseData.caseNumber || "N/A"}
         ===============================================

1. EXECUTIVE SUMMARY
   This report pertains to a ${type} case reported on ${new Date().toLocaleDateString()}.
   The case has been classified as ${priority} priority and requires immediate attention
   from the investigating officer. Initial AI analysis suggests further investigation
   is warranted based on the evidence available.

2. INCIDENT DETAILS
   - Case Title: ${caseData.title || "Not specified"}
   - Type: ${type}
   - Priority: ${priority}
   - Status: ${caseData.status || "Open"}
   - Location: ${caseData.location || "To be verified"}
   - Description: ${caseData.description || "No description provided"}

3. INVESTIGATION FINDINGS
   - AI Summary: ${caseData.aiSummary || "AI analysis pending"}
   - Evidence Items: ${caseData.evidence?.length || 0}
   - Suspects Identified: ${caseData.suspects?.length || 0}
   - Witnesses: ${caseData.witnesses || 0}

4. EVIDENCE ANALYSIS
   Evidence from this case requires physical verification. The following items
   have been documented:
   ${caseData.evidence?.length > 0 
     ? caseData.evidence.map((_, i) => `   - Evidence Item ${i + 1}: Pending analysis`).join("\n")
     : "   - No evidence items recorded yet"}

5. SUSPECT INFORMATION
   ${caseData.suspects?.length > 0 
     ? caseData.suspects.map(s => `   - ${s.name || "Unknown"}: ${s.description || "Under investigation"} (Status: ${s.status || "unknown"})`).join("\n")
     : "   - No suspects identified yet"}

6. RECOMMENDED NEXT STEPS
   1. Visit the incident location and conduct on-site investigation
   2. Interview the complainant and all witnesses
   3. Collect and preserve physical evidence
   4. Retrieve and review CCTV footage from the area
   5. Coordinate with local police station for additional support
   6. Prepare daily investigation diary entries

7. CONCLUSION
   This case requires thorough investigation following standard operating
   procedures. All evidence must be properly documented and chain of custody
   maintained. Regular progress updates should be submitted to the supervising
   officer.

   ===============================================
   Report Generated: ${new Date().toISOString()}
   AI Analysis Mode: Backup/Fallback
   ===============================================
`;

};

const answerLegalQuestion = async (question, context = "") => {
  const q = question.toLowerCase();
  const seed = _hash(question);

  // Common legal questions for Indian law enforcement
  if (q.includes("arrest")) {
    return `LEGAL ADVISORY - ARREST PROCEDURE:

Under Indian law (BNSS Section 35), arrest requires:

1. REASONABLE SUSPICION: The officer must have reasonable suspicion that the person has committed a non-bailable offense.

2. INFORMATION: The arresting officer must inform the arrested person of the grounds for arrest.

3. RIGHT TO BAIL: The arrested person must be informed of their right to bail.

4. MEDICAL EXAMINATION: The arrested person has the right to medical examination by a registered medical practitioner.

5. PRODUCTION BEFORE MAGISTRATE: The arrested person must be produced before a magistrate within 24 hours of arrest.

Reference: Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023`;
  }

  if (q.includes("search") || q.includes("warrant")) {
    return `LEGAL ADVISARY - SEARCH AND SEIZURE:

Under BNSS Section 165, search warrants:

1. A magistrate may issue a search warrant for premises suspected to contain:
   - Stolen property
   - Forged documents
   - Counterfeit coins
   - Evidence of an offense

2. The search must be conducted in presence of:
   - Two independent witnesses
   - The occupier of the premises (if present)

3. Seized items must be inventoried and produce before the court.

4. Video recording of search is recommended under BNSS.

Reference: BNSS Sections 165-171`;
  }

  if (q.includes("fir") || q.includes("complaint")) {
    return `LEGAL ADVISORY - FIR REGISTRATION:

Under BNSS Section 173:

1. Every information relating to commission of cognizable offense must be registered as FIR.

2. The duty officer cannot refuse to register FIR.

3. Copy of FIR must be provided to the complainant free of cost.

4. Investigation must begin within 24 hours of FIR registration.

5. If the offense is non-cognizable, the matter should be referred to the appropriate court.

Reference: BNSS Sections 173-176`;
  }

  if (q.includes("evidence") || q.includes("proof")) {
    return `LEGAL ADVISORY - EVIDENCE COLLECTION:

Under Indian Evidence Act and BNSS:

1. Documentary evidence must be original and properly attested.

2. Digital evidence (call records, emails) requires proper chain of custody.

3. Witness statements should be recorded under Section 180 BNSS.

4. Medical evidence must be from registered practitioners.

5. Circumstantial evidence requires multiple supportive facts.

6. All evidence must be preserved with proper labeling and storage.

Note: Consult public prosecutor for case-specific guidance.`;
  }

  // Default response for other questions
  return `LEGAL QUERY RESPONSE:

Your question: "${question}"

Based on the context provided, the following guidance applies:

For criminal investigations under Indian law, officers should refer to:
- Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023
- Indian Penal Code (IPC)
- Evidence Act

This response is generated in fallback mode. For specific legal advice,
please consult with the legal cell or public prosecutor.

Context received: ${context ? "Yes" : "No"}
Query Hash: ${seed}
Generated at: ${new Date().toISOString()}`;
};

module.exports = {
  name: "mock",
  analyzeFIR,
  generateInvestigationReport,
  answerLegalQuestion,
};
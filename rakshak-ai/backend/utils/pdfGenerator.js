const PDFDocument = require("pdfkit");

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  navy:       "#0f2044",
  navyLight:  "#1a3a6e",
  cyan:       "#0891b2",
  cyanLight:  "#e0f7fa",
  slate:      "#334155",
  slateLight: "#64748b",
  border:     "#cbd5e1",
  white:      "#ffffff",
  black:      "#0f172a",
  red:        "#dc2626",
  amber:      "#d97706",
  green:      "#16a34a",
  rowAlt:     "#f8fafc",
};

const PRIORITY_COLOR = { low: C.green, medium: C.amber, high: C.red, critical: C.red };
const STATUS_COLOR   = { open: C.cyan, closed: C.green, pending: C.amber, under_investigation: C.navyLight };

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "N/A";
const safe = (v, fallback = "N/A") => (v !== undefined && v !== null && v !== "") ? String(v) : fallback;
const arr  = (v) => Array.isArray(v) ? v : [];

// ── Drawing primitives ────────────────────────────────────────────────────────

const drawHRule = (doc, y, color = C.border, thickness = 0.5) => {
  doc.save().moveTo(50, y).lineTo(doc.page.width - 50, y)
     .lineWidth(thickness).strokeColor(color).stroke().restore();
};

const drawFilledRect = (doc, x, y, w, h, color) => {
  doc.save().rect(x, y, w, h).fillColor(color).fill().restore();
};

const sectionTitle = (doc, text) => {
  const y = doc.y + 14;
  drawFilledRect(doc, 50, y, doc.page.width - 100, 22, C.navy);
  doc.fontSize(9).fillColor(C.white).font("Helvetica-Bold")
     .text(text.toUpperCase(), 58, y + 6, { width: doc.page.width - 116 });
  doc.y = y + 30;
};

const labelValue = (doc, label, value, x, y, labelW = 110) => {
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight)
     .text(label, x, y, { width: labelW, continued: false });
  doc.font("Helvetica").fontSize(8.5).fillColor(C.black)
     .text(safe(value), x + labelW, y, { width: 200 });
};

const badge = (doc, text, color, x, y) => {
  const w = doc.widthOfString(text, { fontSize: 7.5 }) + 12;
  doc.save().roundedRect(x, y - 1, w, 13, 3).fillColor(color).fill().restore();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.white).text(text, x + 6, y + 1);
  return x + w + 6;
};

// ── Table renderer ────────────────────────────────────────────────────────────

const drawTable = (doc, headers, rows, colWidths, startY) => {
  const pageW   = doc.page.width - 100;
  const rowH    = 18;
  let   y       = startY;

  // Header row
  drawFilledRect(doc, 50, y, pageW, rowH, C.navyLight);
  let x = 50;
  headers.forEach((h, i) => {
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.white)
       .text(h, x + 4, y + 5, { width: colWidths[i] - 8, ellipsis: true });
    x += colWidths[i];
  });
  y += rowH;

  // Data rows
  rows.forEach((row, ri) => {
    if (y > doc.page.height - 80) { doc.addPage(); y = 60; }
    if (ri % 2 === 0) drawFilledRect(doc, 50, y, pageW, rowH, C.rowAlt);
    drawHRule(doc, y + rowH, C.border, 0.3);
    x = 50;
    row.forEach((cell, ci) => {
      doc.font("Helvetica").fontSize(7.5).fillColor(C.black)
         .text(safe(cell), x + 4, y + 5, { width: colWidths[ci] - 8, ellipsis: true });
      x += colWidths[ci];
    });
    y += rowH;
  });

  doc.y = y + 6;
};

// ── Bullet list ───────────────────────────────────────────────────────────────

const bulletList = (doc, items, indent = 60) => {
  arr(items).forEach((item) => {
    if (doc.y > doc.page.height - 80) doc.addPage();
    doc.font("Helvetica").fontSize(8.5).fillColor(C.cyan)
       .text("•", indent, doc.y, { continued: true, width: 10 });
    doc.fillColor(C.black).text("  " + safe(item), { indent: 0, width: doc.page.width - indent - 60 });
  });
};

// ── Main generator ────────────────────────────────────────────────────────────

/**
 * Generates a professional investigation report PDF.
 * @param {Object} data  - Assembled report data (see reportsController.js)
 * @returns {Promise<Buffer>}
 */
const generateReportPDF = (data) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const chunks = [];
    doc.on("data",  (c) => chunks.push(c));
    doc.on("end",   ()  => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { caseDoc, report, officer, generatedAt } = data;
    const ai   = caseDoc.aiAnalysis      || {};
    const ml   = caseDoc.mlPrediction    || {};
    const wf   = caseDoc.workflowReport  || {};
    const sup  = wf.supervisorReport     || {};
    const inv  = wf.investigationAnalysis || {};
    const evA  = wf.evidenceAnalysis     || {};
    const leg  = wf.legalAnalysis        || {};
    const pageW = doc.page.width - 100;

    // ── PAGE 1: HEADER ────────────────────────────────────────────────────────

    // Navy header band
    drawFilledRect(doc, 0, 0, doc.page.width, 90, C.navy);

    // Emblem placeholder circle
    doc.save().circle(75, 45, 28).lineWidth(2).strokeColor(C.cyan).stroke()
       .font("Helvetica-Bold").fontSize(7).fillColor(C.cyan).text("RAKSHAK", 55, 38)
       .fontSize(6).fillColor(C.white).text("AI PLATFORM", 57, 47).restore();

    // Title block
    doc.font("Helvetica-Bold").fontSize(16).fillColor(C.white)
       .text("INVESTIGATION REPORT", 115, 18, { width: 340 });
    doc.font("Helvetica").fontSize(9).fillColor("#94a3b8")
       .text("AI-Powered Crime Intelligence & Investigation Platform", 115, 38);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.cyan)
       .text(`Case No: ${safe(caseDoc.caseNumber)}`, 115, 54);
    doc.font("Helvetica").fontSize(8).fillColor("#94a3b8")
       .text(`Generated: ${fmt(generatedAt)}  |  Classification: CONFIDENTIAL`, 115, 68);

    // Confidence badge (top-right)
    if (sup.confidenceScore !== undefined) {
      const score = sup.confidenceScore;
      const scoreColor = score >= 70 ? C.green : score >= 40 ? C.amber : C.red;
      drawFilledRect(doc, doc.page.width - 110, 15, 80, 60, C.navyLight);
      doc.font("Helvetica-Bold").fontSize(22).fillColor(scoreColor)
         .text(`${score}%`, doc.page.width - 100, 22, { width: 60, align: "center" });
      doc.font("Helvetica").fontSize(7).fillColor("#94a3b8")
         .text("CONFIDENCE", doc.page.width - 100, 50, { width: 60, align: "center" });
    }

    doc.y = 105;

    // ── SECTION 1: CASE SUMMARY ───────────────────────────────────────────────
    sectionTitle(doc, "1. Case Summary");

    const col1x = 50, col2x = 310;
    const startY = doc.y;

    labelValue(doc, "Case Number",    caseDoc.caseNumber,                col1x, startY);
    labelValue(doc, "Case Title",     caseDoc.title,                     col1x, startY + 14);
    labelValue(doc, "Crime Type",     cap(caseDoc.type),                 col1x, startY + 28);
    labelValue(doc, "Incident Date",  fmt(caseDoc.incidentDate),         col1x, startY + 42);
    labelValue(doc, "Location",       caseDoc.location,                  col1x, startY + 56);
    labelValue(doc, "Complainant",    caseDoc.complainant?.name,         col1x, startY + 70);

    labelValue(doc, "Filed By",       officer?.name,                     col2x, startY,      90);
    labelValue(doc, "Badge No.",      officer?.badgeNumber,              col2x, startY + 14, 90);
    labelValue(doc, "Department",     officer?.department,               col2x, startY + 28, 90);
    labelValue(doc, "Witnesses",      caseDoc.witnesses,                 col2x, startY + 42, 90);
    labelValue(doc, "Evidence Items", arr(caseDoc.evidence).length,      col2x, startY + 56, 90);
    labelValue(doc, "Suspects",       arr(caseDoc.suspects).length,      col2x, startY + 70, 90);

    // Status + Priority badges
    doc.y = startY + 88;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight).text("Status", col1x, doc.y);
    let bx = badge(doc, cap(caseDoc.status), STATUS_COLOR[caseDoc.status] || C.slate, col1x + 45, doc.y);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight).text("Priority", bx + 10, doc.y);
    badge(doc, cap(caseDoc.priority), PRIORITY_COLOR[caseDoc.priority] || C.slate, bx + 55, doc.y);

    doc.y += 18;

    // AI Summary
    if (ai.summary || caseDoc.aiSummary) {
      doc.moveDown(0.4);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight).text("AI Summary", col1x, doc.y);
      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(8.5).fillColor(C.black)
         .text(safe(ai.summary || caseDoc.aiSummary), col1x, doc.y, { width: pageW, align: "justify" });
    }

    // ML Prediction
    if (ml.estimatedDays) {
      doc.moveDown(0.6);
      drawFilledRect(doc, 50, doc.y, pageW, 22, C.cyanLight);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.navy)
         .text(`ML Prediction: Estimated investigation time — ${ml.estimatedDays} days`, 58, doc.y + 7);
      doc.y += 28;
    }

    // ── SECTION 2: EVIDENCE TABLE ─────────────────────────────────────────────
    doc.moveDown(0.5);
    sectionTitle(doc, "2. Evidence Analysis");

    const evidenceRows = arr(caseDoc.evidence).map((e, i) => [
      i + 1,
      e.originalName || e.filename,
      cap(e.fileType),
      e.description || "—",
      fmt(e.createdAt),
      e.tags?.join(", ") || "—",
    ]);

    if (evidenceRows.length > 0) {
      drawTable(doc,
        ["#", "File Name", "Type", "Description", "Uploaded", "Tags"],
        evidenceRows,
        [25, 130, 55, 150, 70, 82],
        doc.y
      );
    } else {
      doc.font("Helvetica").fontSize(8.5).fillColor(C.slateLight)
         .text("No evidence items uploaded for this case.", 60, doc.y);
      doc.y += 16;
    }

    // Evidence strength from workflow
    if (evA.strengthScore !== undefined) {
      doc.moveDown(0.3);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight)
         .text(`Evidence Strength: `, 50, doc.y, { continued: true });
      doc.font("Helvetica-Bold").fontSize(8)
         .fillColor(evA.strengthScore >= 7 ? C.green : evA.strengthScore >= 4 ? C.amber : C.red)
         .text(`${evA.strengthScore}/10 — ${cap(evA.strengthLabel)}`);
      doc.moveDown(0.3);
      if (evA.evidenceSummary) {
        doc.font("Helvetica").fontSize(8.5).fillColor(C.black)
           .text(evA.evidenceSummary, 50, doc.y, { width: pageW });
      }
    }

    // ── SECTION 3: TIMELINE ───────────────────────────────────────────────────
    doc.addPage();
    sectionTitle(doc, "3. Investigation Timeline");

    const timeline = arr(sup.timeline?.length ? sup.timeline : inv.timeline);
    if (timeline.length > 0) {
      drawTable(doc,
        ["Date / Time", "Event", "Significance"],
        timeline.map((t) => [safe(t.date), safe(t.event), safe(t.significance)]),
        [110, 200, 202],
        doc.y
      );
    } else {
      doc.font("Helvetica").fontSize(8.5).fillColor(C.slateLight)
         .text("Timeline not available. Run the investigation workflow to generate.", 60, doc.y);
      doc.y += 16;
    }

    // ── SECTION 4: SUSPECTS ───────────────────────────────────────────────────
    doc.moveDown(0.5);
    sectionTitle(doc, "4. Suspects");

    const suspectRows = arr(caseDoc.suspects).map((s, i) => [
      i + 1, s.name || "Unknown", s.age || "—", s.description || "—", cap(s.status),
    ]);

    if (suspectRows.length > 0) {
      drawTable(doc,
        ["#", "Name", "Age", "Description", "Status"],
        suspectRows,
        [25, 100, 35, 270, 82],
        doc.y
      );
    } else {
      doc.font("Helvetica").fontSize(8.5).fillColor(C.slateLight)
         .text("No suspects identified.", 60, doc.y);
      doc.y += 16;
    }

    // ── SECTION 5: AI FINDINGS ────────────────────────────────────────────────
    doc.moveDown(0.5);
    sectionTitle(doc, "5. AI Findings");

    if (ai.possibleMotive) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight).text("Possible Motive", 50, doc.y);
      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(8.5).fillColor(C.black).text(ai.possibleMotive, 60, doc.y, { width: pageW - 10 });
      doc.moveDown(0.5);
    }

    if (arr(ai.investigationSteps).length > 0) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight).text("Recommended Investigation Steps", 50, doc.y);
      doc.moveDown(0.3);
      bulletList(doc, ai.investigationSteps);
      doc.moveDown(0.4);
    }

    if (arr(ai.evidenceMentioned).length > 0) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight).text("Evidence Mentioned in FIR", 50, doc.y);
      doc.moveDown(0.3);
      bulletList(doc, ai.evidenceMentioned);
      doc.moveDown(0.4);
    }

    // Risk level
    if (ai.riskLevel) {
      const rColor = PRIORITY_COLOR[ai.riskLevel] || C.slate;
      drawFilledRect(doc, 50, doc.y, pageW, 20, rColor + "22");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(rColor)
         .text(`Risk Level: ${cap(ai.riskLevel)}`, 58, doc.y + 6);
      doc.y += 26;
    }

    // ── SECTION 6: LEGAL REFERENCES ──────────────────────────────────────────
    doc.addPage();
    sectionTitle(doc, "6. Legal References");

    const sections = arr(leg.applicableSections);
    if (sections.length > 0) {
      drawTable(doc,
        ["Section", "Act", "Description", "Relevance"],
        sections.map((s) => [s.section, s.act, s.description, s.relevance]),
        [65, 90, 180, 177],
        doc.y
      );
    } else {
      doc.font("Helvetica").fontSize(8.5).fillColor(C.slateLight)
         .text("Run the investigation workflow to generate legal references.", 60, doc.y);
      doc.y += 16;
    }

    if (leg.legalStrength) {
      doc.moveDown(0.4);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight)
         .text(`Legal Strength: `, 50, doc.y, { continued: true });
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.navy).text(cap(leg.legalStrength));
    }

    if (leg.arrestJustification) {
      doc.moveDown(0.4);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight).text("Arrest Justification", 50, doc.y);
      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(8.5).fillColor(C.black)
         .text(leg.arrestJustification, 60, doc.y, { width: pageW - 10 });
    }

    if (arr(leg.legalRisks).length > 0) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight).text("Legal Risks", 50, doc.y);
      doc.moveDown(0.3);
      bulletList(doc, leg.legalRisks);
    }

    // ── SECTION 7: INVESTIGATION RECOMMENDATIONS ─────────────────────────────
    doc.moveDown(0.6);
    sectionTitle(doc, "7. Investigation Recommendations");

    const recs = arr(sup.investigationRecommendations?.length
      ? sup.investigationRecommendations
      : inv.nextSteps);

    if (recs.length > 0) {
      bulletList(doc, recs);
    } else {
      doc.font("Helvetica").fontSize(8.5).fillColor(C.slateLight)
         .text("No recommendations available.", 60, doc.y);
    }

    // Next actions table
    const nextActions = arr(sup.nextActions);
    if (nextActions.length > 0) {
      doc.moveDown(0.6);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight).text("Next Actions", 50, doc.y);
      doc.moveDown(0.3);
      drawTable(doc,
        ["Action", "Priority", "Assign To"],
        nextActions.map((a) => [a.action, cap(a.priority), a.assignTo || "Investigating Officer"]),
        [280, 90, 142],
        doc.y
      );
    }

    // Supervisor notes
    if (sup.supervisorNotes) {
      doc.moveDown(0.5);
      drawFilledRect(doc, 50, doc.y, pageW, 20, C.cyanLight);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.navy)
         .text("Supervisor Notes", 58, doc.y + 6);
      doc.y += 26;
      doc.font("Helvetica").fontSize(8.5).fillColor(C.black)
         .text(sup.supervisorNotes, 60, doc.y, { width: pageW - 10, align: "justify" });
    }

    // ── SECTION 8: OFFICER SIGNATURE ─────────────────────────────────────────
    if (doc.y > doc.page.height - 160) doc.addPage();
    doc.moveDown(1.5);
    sectionTitle(doc, "8. Officer Signature & Certification");

    const sigY = doc.y + 10;
    const boxW = (pageW - 20) / 2;

    // Left box — Investigating Officer
    doc.rect(50, sigY, boxW, 90).lineWidth(0.5).strokeColor(C.border).stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight)
       .text("INVESTIGATING OFFICER", 58, sigY + 8);
    doc.font("Helvetica").fontSize(8.5).fillColor(C.black)
       .text(`Name: ${safe(officer?.name)}`, 58, sigY + 22)
       .text(`Badge No.: ${safe(officer?.badgeNumber)}`, 58, sigY + 34)
       .text(`Department: ${safe(officer?.department)}`, 58, sigY + 46);
    drawHRule(doc, sigY + 68, C.border);
    doc.font("Helvetica").fontSize(7.5).fillColor(C.slateLight)
       .text("Signature & Date", 58, sigY + 72);

    // Right box — Supervisor
    const rx = 50 + boxW + 20;
    doc.rect(rx, sigY, boxW, 90).lineWidth(0.5).strokeColor(C.border).stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slateLight)
       .text("SUPERVISING OFFICER", rx + 8, sigY + 8);
    doc.font("Helvetica").fontSize(8.5).fillColor(C.black)
       .text("Name: ___________________________", rx + 8, sigY + 22)
       .text("Rank: ___________________________", rx + 8, sigY + 34)
       .text("Date: ___________________________", rx + 8, sigY + 46);
    drawHRule(doc, sigY + 68, C.border);
    doc.font("Helvetica").fontSize(7.5).fillColor(C.slateLight)
       .text("Signature & Date", rx + 8, sigY + 72);

    doc.y = sigY + 100;

    // Certification statement
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(7.5).fillColor(C.slateLight)
       .text(
         "I certify that the information contained in this report is accurate and complete to the best of my knowledge. " +
         "This report was generated with AI assistance and has been reviewed for accuracy.",
         50, doc.y, { width: pageW, align: "justify" }
       );

    // ── PAGE FOOTER (all pages) ───────────────────────────────────────────────
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 30;
      drawHRule(doc, footerY - 6, C.border);
      doc.font("Helvetica").fontSize(7).fillColor(C.slateLight)
         .text(`Rakshak AI Platform  |  Case: ${safe(caseDoc.caseNumber)}  |  CONFIDENTIAL`, 50, footerY, { width: pageW - 80 })
         .text(`Page ${i + 1} of ${totalPages}`, 50, footerY, { width: pageW, align: "right" });
    }

    doc.end();
  });

module.exports = { generateReportPDF };

const { Case, User, Evidence } = require("../models");
const { analyzeFIR } = require("../services/geminiService");
const { predictInvestigationTime } = require("../services/mlService");

// GET /api/cases
const getCases = async (req, res) => {
  const { search, status, priority, type, page = 1, limit = 10 } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (type) filter.type = type;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { caseNumber: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [cases, total] = await Promise.all([
    Case.find(filter)
      .populate("filedBy", "name badgeNumber")
      .populate("assignedOfficer", "name badgeNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Case.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    cases,
  });
};

// GET /api/cases/:id
const getCaseById = async (req, res) => {
  const caseDoc = await Case.findById(req.params.id)
    .populate("filedBy", "name badgeNumber role department")
    .populate("assignedOfficer", "name badgeNumber role department")
    .populate("evidence")
    .populate("report");

  if (!caseDoc) return res.status(404).json({ success: false, message: "Case not found." });
  res.status(200).json({ success: true, case: caseDoc });
};

// POST /api/cases/upload-fir  — main FIR creation with file + AI + ML
const uploadFIR = async (req, res) => {
  const {
    title, description, type, priority, location,
    incidentDate, complainantName, complainantContact, complainantAddress,
    witnesses,
  } = req.body;

  if (!title || !type) {
    return res.status(400).json({ success: false, message: "Title and type are required." });
  }

  // 1. Create the case
  const newCase = await Case.create({
    title, description, type, priority, location, incidentDate, witnesses: Number(witnesses) || 0,
    filedBy: req.user._id,
    assignedOfficer: req.user._id,
    complainant: { name: complainantName, contact: complainantContact, address: complainantAddress },
  });

  // 2. Save uploaded files as evidence
  if (req.files && req.files.length > 0) {
    const evidenceDocs = await Promise.all(
      req.files.map((file) =>
        Evidence.create({
          caseId: newCase._id,
          filename: file.filename,
          originalName: file.originalname,
          fileType: file.mimetype.startsWith("image/") ? "image" : "document",
          mimeType: file.mimetype,
          fileSize: file.size,
          url: `/uploads/${file.filename}`,
          uploadedBy: req.user._id,
        })
      )
    );
    newCase.evidence = evidenceDocs.map((e) => e._id);
  }

  // 3. Run Gemini AI analysis on description
  const firText = `${title}\n${description || ""}\nLocation: ${location || ""}\nComplainant: ${complainantName || ""}`;
  const aiAnalysis = await analyzeFIR(firText);

  newCase.aiSummary = aiAnalysis.summary;
  newCase.aiAnalysis = aiAnalysis;

  // Override priority/type from AI if not explicitly set
  if (!priority && aiAnalysis.priority) newCase.priority = aiAnalysis.priority;
  if (aiAnalysis.suspects?.length > 0) {
    newCase.suspects = aiAnalysis.suspects.map((s) => ({ name: s.name, description: s.description }));
  }

  // 4. Call ML service for predicted investigation time
  const mlPrediction = await predictInvestigationTime({
    type: newCase.type,
    priority: newCase.priority,
    witnesses: newCase.witnesses,
    evidence: newCase.evidence,
  });

  newCase.mlPrediction = {
    predictedDays: mlPrediction.predicted_days,
    confidence: mlPrediction.confidence,
    message: mlPrediction.message,
  };

  await newCase.save();

  // 5. Add to officer's assigned cases
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { assignedCases: newCase._id } });

  const populated = await Case.findById(newCase._id)
    .populate("filedBy", "name badgeNumber")
    .populate("assignedOfficer", "name badgeNumber")
    .populate("evidence");

  res.status(201).json({ success: true, case: populated });
};

// POST /api/cases  — quick case creation without file upload
const createCase = async (req, res) => {
  req.files = [];
  return uploadFIR(req, res);
};

// PUT /api/cases/:id
const updateCase = async (req, res) => {
  const allowed = [
    "title", "description", "status", "priority", "location",
    "assignedOfficer", "suspects", "aiSummary", "witnesses", "incidentDate",
  ];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const updated = await Case.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  })
    .populate("filedBy", "name badgeNumber")
    .populate("assignedOfficer", "name badgeNumber");

  if (!updated) return res.status(404).json({ success: false, message: "Case not found." });
  res.status(200).json({ success: true, case: updated });
};

// PATCH /api/cases/:id/assign
const assignOfficer = async (req, res) => {
  const { officerId } = req.body;
  if (!officerId) return res.status(400).json({ success: false, message: "officerId is required." });

  const officer = await User.findById(officerId);
  if (!officer) return res.status(404).json({ success: false, message: "Officer not found." });

  const updated = await Case.findByIdAndUpdate(
    req.params.id,
    { assignedOfficer: officerId },
    { new: true }
  ).populate("assignedOfficer", "name badgeNumber role");

  if (!updated) return res.status(404).json({ success: false, message: "Case not found." });

  await User.findByIdAndUpdate(officerId, { $addToSet: { assignedCases: req.params.id } });
  res.status(200).json({ success: true, case: updated });
};

// PATCH /api/cases/:id/status
const updateStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["open", "closed", "pending", "under_investigation"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status." });
  }

  const updated = await Case.findByIdAndUpdate(
    req.params.id,
    { status, ...(status === "closed" ? { closedAt: new Date() } : {}) },
    { new: true }
  );

  if (!updated) return res.status(404).json({ success: false, message: "Case not found." });
  res.status(200).json({ success: true, case: updated });
};

// DELETE /api/cases/:id
const deleteCase = async (req, res) => {
  const caseDoc = await Case.findByIdAndDelete(req.params.id);
  if (!caseDoc) return res.status(404).json({ success: false, message: "Case not found." });
  res.status(200).json({ success: true, message: "Case deleted." });
};

module.exports = { getCases, getCaseById, createCase, uploadFIR, updateCase, assignOfficer, updateStatus, deleteCase };

const { Case, User, Evidence } = require("../models");
const { analyzeFIR } = require("../services/ai");
const { predictInvestigationTime } = require("../services/mlService");

// GET /api/cases
const getCases = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

// GET /api/cases/:id
const getCaseById = async (req, res, next) => {
  try {
    const caseDoc = await Case.findById(req.params.id)
      .populate("filedBy", "name badgeNumber role department")
      .populate("assignedOfficer", "name badgeNumber role department")
      .populate("evidence")
      .populate("report");

    if (!caseDoc) return res.status(404).json({ success: false, message: "Case not found." });
    res.status(200).json({ success: true, case: caseDoc });
  } catch (err) {
    next(err);
  }
};

// POST /api/cases/upload-fir
const uploadFIR = async (req, res, next) => {
  try {
    const {
      title, description, type, priority, location,
      incidentDate, complainantName, complainantContact, complainantAddress,
      witnesses,
    } = req.body;

    if (!title || !type) {
      return res.status(400).json({ success: false, message: "Title and type are required." });
    }

    const caseData = {
      title,
      description,
      type,
      priority,
      location,
      incidentDate,
      witnesses: Number(witnesses) || 0,
      filedBy: req.user._id,
      assignedOfficer: req.user._id,
      complainant: { name: complainantName, contact: complainantContact, address: complainantAddress },
    };

    const newCase = await Case.create(caseData);
    console.log("[uploadFIR] Case created:", newCase._id);

    // Handle file uploads - defensive check
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      console.log("[uploadFIR] Processing", files.length, "files");
      try {
        const evidenceDocs = await Promise.all(
          files.map((file) =>
            Evidence.create({
              caseId: newCase._id,
              filename: file.filename,
              originalName: file.originalname,
              fileType: file.mimetype?.startsWith("image/") ? "image" : "document",
              mimeType: file.mimetype,
              fileSize: file.size,
              url: `/uploads/${file.filename}`,
              uploadedBy: req.user._id,
            })
          )
        );
        newCase.evidence = evidenceDocs.map((e) => e._id);
        console.log("[uploadFIR] Evidence created:", evidenceDocs.length);
      } catch (evidenceErr) {
        console.error("[uploadFIR] Evidence creation failed:", evidenceErr.message);
        // Continue without evidence - don't fail the whole case
      }
    }

    // AI Analysis
    console.log("[uploadFIR] Calling Gemini...");
    const firText = `${title}\n${description || ""}\nLocation: ${location || ""}\nComplainant: ${complainantName || ""}`;
    const aiAnalysis = await analyzeFIR(firText);
    console.log("[uploadFIR] AI Analysis done:", aiAnalysis.summary?.substring(0, 50));

    newCase.aiSummary = aiAnalysis.summary;
    newCase.aiAnalysis = aiAnalysis;

    if (!priority && aiAnalysis.priority) newCase.priority = aiAnalysis.priority;
    if (aiAnalysis.suspects?.length > 0) {
      newCase.suspects = aiAnalysis.suspects.map((s) => ({
        name: s.name,
        description: s.description,
        status: s.status || "unknown"
      }));
      console.log("[uploadFIR] Suspects mapped:", newCase.suspects.length);
    }

    // ML Prediction
    console.log("[uploadFIR] Calling ML service...");
    const mlPrediction = await predictInvestigationTime({
      type: newCase.type,
      priority: newCase.priority,
      witnesses: newCase.witnesses,
      evidence: newCase.evidence,
    });
    console.log("[uploadFIR] ML Prediction:", mlPrediction);

    newCase.mlPrediction = {
      estimatedDays: mlPrediction.estimatedDays,
    };

    console.log("[uploadFIR] Saving case...");
    await newCase.save();
    console.log("[uploadFIR] Case saved successfully");
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { assignedCases: newCase._id } });

    const populated = await Case.findById(newCase._id)
      .populate("filedBy", "name badgeNumber")
      .populate("assignedOfficer", "name badgeNumber")
      .populate("evidence");

    res.status(201).json({ success: true, case: populated });
  } catch (err) {
    console.error("[uploadFIR] ERROR:", err.message, err.stack);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create case",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
};

// POST /api/cases
const createCase = async (req, res, next) => {
  req.files = [];
  return uploadFIR(req, res, next);
};

// PUT /api/cases/:id
const updateCase = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

// PATCH /api/cases/:id/assign
const assignOfficer = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

// PATCH /api/cases/:id/status
const updateStatus = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

// DELETE /api/cases/:id
const deleteCase = async (req, res, next) => {
  try {
    const caseDoc = await Case.findByIdAndDelete(req.params.id);
    if (!caseDoc) return res.status(404).json({ success: false, message: "Case not found." });
    res.status(200).json({ success: true, message: "Case deleted." });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCases, getCaseById, createCase, uploadFIR, updateCase, assignOfficer, updateStatus, deleteCase };

const mongoose = require("mongoose");

const suspectSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  age: { type: Number },
  description: { type: String },
  status: {
    type: String,
    enum: ["wanted", "arrested", "released", "unknown"],
    default: "unknown",
  },
});

const caseSchema = new mongoose.Schema(
  {
    caseNumber: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: [true, "Case title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Case type is required"],
      enum: ["theft", "assault", "fraud", "murder", "cybercrime", "kidnapping", "other"],
    },
    status: {
      type: String,
      enum: ["open", "closed", "pending", "under_investigation"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    location: {
      type: String,
      trim: true,
    },
    incidentDate: {
      type: Date,
    },
    // Officer who filed the FIR
    filedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Officer assigned to investigate
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    suspects: [suspectSchema],
    // Evidence items linked to this case
    evidence: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Evidence",
      },
    ],
    // One-to-one: generated report
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
    },
    complainant: {
      name: { type: String, trim: true },
      contact: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    aiSummary: { type: String },
    aiAnalysis: {
      summary:            String,
      crimeCategory:      String,
      priority:           String,
      riskLevel:          String,
      victims:            [{ name: String, age: Number, description: String }],
      suspects:           [{ name: String, description: String, status: String }],
      locations:          [String],
      importantDates:     [String],
      evidenceMentioned:  [String],
      possibleMotive:     String,
      investigationSteps: [String],
      analyzedAt:         { type: Date, default: null },
    },
    mlPrediction: {
      estimatedDays: { type: Number, default: null },
    },
    workflowReport: {
      caseNumber:            String,
      generatedAt:           Date,
      investigationAnalysis: { type: mongoose.Schema.Types.Mixed },
      evidenceAnalysis:      { type: mongoose.Schema.Types.Mixed },
      legalAnalysis:         { type: mongoose.Schema.Types.Mixed },
      supervisorReport: {
        reportTitle:                  String,
        caseSummary:                  String,
        timeline:                     [mongoose.Schema.Types.Mixed],
        evidenceAnalysis:             { type: mongoose.Schema.Types.Mixed },
        legalConsiderations:          { type: mongoose.Schema.Types.Mixed },
        investigationRecommendations: [String],
        nextActions:                  [mongoose.Schema.Types.Mixed],
        confidenceScore:              Number,
        caseStrength:                 String,
        estimatedResolutionDays:      Number,
        supervisorNotes:              String,
      },
    },
    witnesses: { type: Number, default: 0 },
    closedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Auto-generate case number before saving
caseSchema.pre("save", async function () {
  if (this.caseNumber) return;
  const year = new Date().getFullYear();
  const count = await mongoose.model("Case").countDocuments();
  this.caseNumber = `RKS-${year}-${String(count + 1).padStart(4, "0")}`;
});

// Set closedAt when status changes to closed
caseSchema.pre("save", function () {
  if (this.isModified("status") && this.status === "closed") {
    this.closedAt = new Date();
  }
});

module.exports = mongoose.model("Case", caseSchema);

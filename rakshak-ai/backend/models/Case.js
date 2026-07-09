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
      summary: String,
      crimeType: String,
      victims: [{ name: String, age: Number, description: String }],
      locations: [String],
      dates: [String],
      possibleMotive: String,
      importantEvidence: [String],
      recommendedActions: [String],
    },
    mlPrediction: {
      predictedDays: Number,
      confidence: Number,
      message: String,
    },
    workflowReport: { type: mongoose.Schema.Types.Mixed },
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

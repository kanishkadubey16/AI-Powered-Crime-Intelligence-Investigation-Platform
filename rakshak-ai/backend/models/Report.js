const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    // One-to-one with Case
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: [true, "Case reference is required"],
      unique: true, // enforces one report per case
    },
    title: {
      type: String,
      required: [true, "Report title is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["case_summary", "crime_analysis", "officer_performance", "monthly_report"],
      default: "case_summary",
    },
    content: {
      type: String, // full report text / markdown
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
    // Path to exported PDF if generated
    pdfPath: {
      type: String,
    },
    status: {
      type: String,
      enum: ["draft", "final"],
      default: "draft",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);

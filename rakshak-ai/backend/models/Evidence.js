const mongoose = require("mongoose");

const evidenceSchema = new mongoose.Schema(
  {
    // Belongs to one case
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: [true, "Case reference is required"],
    },
    filename: {
      type: String,
      required: [true, "Filename is required"],
      trim: true,
    },
    originalName: {
      type: String,
      trim: true,
    },
    fileType: {
      type: String,
      enum: ["image", "video", "audio", "document", "other"],
      default: "other",
    },
    mimeType: {
      type: String,
    },
    fileSize: {
      type: Number, // bytes
    },
    url: {
      type: String, // relative path or cloud URL
    },
    description: {
      type: String,
      trim: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // AI analysis result from ML service
    aiAnalysis: {
      type: String,
    },
    analysedAt: {
      type: Date,
    },
    tags: [{ type: String, trim: true }],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Soft-delete filter
evidenceSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  next();
});

module.exports = mongoose.model("Evidence", evidenceSchema);

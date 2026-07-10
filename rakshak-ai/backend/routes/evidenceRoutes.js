const express = require("express");
const {
  getEvidence, getEvidenceById, uploadEvidence,
  updateEvidence, deleteEvidence, analyzeEvidence,
} = require("../controllers/evidenceController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();
router.use(protect);

router.get("/", getEvidence);
router.post("/", upload.array("files", 10), uploadEvidence);
router.get("/:id", getEvidenceById);
router.put("/:id", updateEvidence);
router.delete("/:id", deleteEvidence);
router.post("/:id/analyze", analyzeEvidence);

// Legacy alias kept so existing callers don't break
router.post("/upload", upload.array("files", 10), uploadEvidence);

module.exports = router;

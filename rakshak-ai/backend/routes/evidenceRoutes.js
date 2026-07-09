const express = require("express");
const { getEvidence, getEvidenceById, uploadEvidence, analyzeEvidence, deleteEvidence } = require("../controllers/evidenceController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.use(protect);

router.get("/", getEvidence);
router.post("/upload", upload.array("files", 10), uploadEvidence);
router.get("/:id", getEvidenceById);
router.post("/:id/analyze", analyzeEvidence);
router.delete("/:id", deleteEvidence);

module.exports = router;

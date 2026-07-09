const express = require("express");
const { chat, analyzeCase, runWorkflow, generateReport, searchLaw } = require("../controllers/aiController");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

router.post("/chat", chat);
router.post("/search-law", searchLaw);
router.post("/analyze-case/:caseId", analyzeCase);
router.post("/run-workflow/:caseId", runWorkflow);
router.post("/generate-report/:caseId", generateReport);

module.exports = router;

const express = require("express");
const { getReports, getReportById, generateReport, downloadReport } = require("../controllers/reportsController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getReports);
router.post("/generate", generateReport);
router.get("/:id", getReportById);
router.get("/:id/download", downloadReport);

module.exports = router;

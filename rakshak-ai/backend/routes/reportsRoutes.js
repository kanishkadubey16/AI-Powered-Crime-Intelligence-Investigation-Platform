const express = require("express");
const {
  getReports, getReportById, generateReport,
  updateReport, deleteReport, downloadReport,
} = require("../controllers/reportsController");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

router.get("/", getReports);
router.post("/", generateReport);
router.get("/:id", getReportById);
router.put("/:id", updateReport);
router.delete("/:id", deleteReport);
router.get("/:id/download", downloadReport);

// Legacy alias kept so existing callers don't break
router.post("/generate", generateReport);

module.exports = router;

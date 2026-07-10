const express = require("express");
const {
  getDashboard, getCrimeTypes, getMonthly, getStatusCounts, getSummary,
} = require("../controllers/analyticsController");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

router.get("/dashboard", getDashboard);
router.get("/crime-types", getCrimeTypes);
router.get("/monthly", getMonthly);
router.get("/status", getStatusCounts);

// Legacy alias kept so existing callers don't break
router.get("/summary", getSummary);

module.exports = router;

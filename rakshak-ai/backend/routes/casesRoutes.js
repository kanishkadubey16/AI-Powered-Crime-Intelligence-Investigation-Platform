const express = require("express");
const {
  getCases, getCaseById, createCase, uploadFIR,
  updateCase, assignOfficer, updateStatus, deleteCase,
} = require("../controllers/casesController");
const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();
router.use(protect);

router.get("/", getCases);
router.post("/", createCase);
router.post("/upload-fir", upload.array("files", 10), uploadFIR);
router.get("/:id", getCaseById);
router.put("/:id", updateCase);
router.patch("/:id/assign", assignOfficer);
router.patch("/:id/status", updateStatus);
router.delete("/:id", authorize("admin"), deleteCase);

module.exports = router;

const { Case, Evidence, Report } = require("../models");

// GET /api/analytics/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [openCases, closedCases, pendingCases, criticalCases, todayCases, totalEvidence, totalReports] =
      await Promise.all([
        Case.countDocuments({ status: "open" }),
        Case.countDocuments({ status: "closed" }),
        Case.countDocuments({ status: "pending" }),
        Case.countDocuments({ priority: "critical" }),
        Case.countDocuments({ createdAt: { $gte: today } }),
        Evidence.countDocuments(),
        Report.countDocuments(),
      ]);

    res.status(200).json({
      success: true,
      data: { openCases, closedCases, pendingCases, criticalCases, todayCases, totalEvidence, totalReports },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/crime-types
const getCrimeTypes = async (req, res, next) => {
  try {
    const crimeTypes = await Case.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $project: { name: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);
    res.status(200).json({ success: true, data: crimeTypes });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/monthly
const getMonthly = async (req, res, next) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthly = await Case.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          total: { $sum: 1 },
          solved: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
          open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $dateToString: {
              format: "%b %Y",
              date: {
                $dateFromParts: { year: "$_id.year", month: "$_id.month", day: 1 },
              },
            },
          },
          total: 1,
          solved: 1,
          open: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: monthly });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/status
const getStatusCounts = async (req, res, next) => {
  try {
    const statusCounts = await Case.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);
    res.status(200).json({ success: true, data: statusCounts });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/summary  (kept for backward compatibility)
const getSummary = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [
      totalCases, openCases, closedCases, pendingCases,
      underInvestigation, criticalCases, todayFIR, totalEvidence,
    ] = await Promise.all([
      Case.countDocuments(),
      Case.countDocuments({ status: "open" }),
      Case.countDocuments({ status: "closed" }),
      Case.countDocuments({ status: "pending" }),
      Case.countDocuments({ status: "under_investigation" }),
      Case.countDocuments({ priority: "critical" }),
      Case.countDocuments({ createdAt: { $gte: today } }),
      Evidence.countDocuments(),
    ]);

    const [monthlyFIR, crimeCategories, statusDistribution, priorityBreakdown] = await Promise.all([
      Case.aggregate([
        { $match: { createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%b %Y", date: "$createdAt" } },
            total: { $sum: 1 },
            solved: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
            open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { month: "$_id", total: 1, solved: 1, open: 1, _id: 0 } },
      ]),
      Case.aggregate([
        { $group: { _id: "$type", value: { $sum: 1 } } },
        { $project: { name: "$_id", value: 1, _id: 0 } },
        { $sort: { value: -1 } },
      ]),
      Case.aggregate([
        { $group: { _id: "$status", value: { $sum: 1 } } },
        { $project: { name: "$_id", value: 1, _id: 0 } },
      ]),
      Case.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: "%b", date: "$createdAt" } },
            critical: { $sum: { $cond: [{ $eq: ["$priority", "critical"] }, 1, 0] } },
            high: { $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] } },
            medium: { $sum: { $cond: [{ $eq: ["$priority", "medium"] }, 1, 0] } },
            low: { $sum: { $cond: [{ $eq: ["$priority", "low"] }, 1, 0] } },
          },
        },
        { $project: { month: "$_id", critical: 1, high: 1, medium: 1, low: 1, _id: 0 } },
      ]),
    ]);

    const recentCases = await Case.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("assignedOfficer", "name badgeNumber")
      .select("caseNumber title status priority type createdAt");

    const activities = await Case.find()
      .sort({ updatedAt: -1 })
      .limit(8)
      .select("caseNumber title status updatedAt");

    res.status(200).json({
      success: true,
      stats: {
        totalCases, openCases, closedCases, pendingCases,
        activeInvestigations: underInvestigation,
        criticalAlerts: criticalCases,
        todayFIR,
        totalEvidence,
      },
      charts: { monthlyFIR, crimeCategories, statusDistribution, priorityBreakdown },
      recentCases,
      activities: activities.map((c) => ({
        message: `Case ${c.caseNumber} — ${c.title} status: ${c.status}`,
        createdAt: c.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard, getCrimeTypes, getMonthly, getStatusCounts, getSummary };

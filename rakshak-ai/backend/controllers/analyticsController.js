const { Case, Evidence, User } = require("../models");

// GET /api/analytics/summary
const getSummary = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  // Monthly FIR stats — last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const monthlyFIR = await Case.aggregate([
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
  ]);

  // Crime category distribution — for Pie chart
  const crimeCategories = await Case.aggregate([
    { $group: { _id: "$type", value: { $sum: 1 } } },
    { $project: { name: "$_id", value: 1, _id: 0 } },
    { $sort: { value: -1 } },
  ]);

  // Case status distribution — for Pie chart
  const statusDistribution = await Case.aggregate([
    { $group: { _id: "$status", value: { $sum: 1 } } },
    { $project: { name: "$_id", value: 1, _id: 0 } },
  ]);

  // Priority breakdown — for Bar chart
  const priorityBreakdown = await Case.aggregate([
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
  ]);

  // Recent 5 cases
  const recentCases = await Case.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("assignedOfficer", "name badgeNumber")
    .select("caseNumber title status priority type createdAt");

  // Recent activity feed
  const activities = await Case.find()
    .sort({ updatedAt: -1 })
    .limit(8)
    .select("caseNumber title status updatedAt");

  const activityFeed = activities.map((c) => ({
    message: `Case ${c.caseNumber} — ${c.title} status: ${c.status}`,
    createdAt: c.updatedAt,
  }));

  res.status(200).json({
    success: true,
    stats: {
      totalCases,
      openCases,
      closedCases,
      pendingCases,
      activeInvestigations: underInvestigation,
      criticalAlerts: criticalCases,
      todayFIR,
      totalEvidence,
    },
    charts: {
      monthlyFIR,
      crimeCategories,
      statusDistribution,
      priorityBreakdown,
    },
    recentCases,
    activities: activityFeed,
  });
};

module.exports = { getSummary };

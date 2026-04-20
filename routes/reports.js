const express = require("express");
const ReportService = require("../services/ReportService");
const DuplicateDetectionService = require("../services/DuplicateDetectionService");
const ReportModerationService = require("../services/ReportModerationService");
const CredibilityService = require("../services/CredibilityService");
const { authenticate, authorize } = require("../middleware/auth");
const router = express.Router();
router.get("/stats/report", async (req, res) => {
  try {
    const { city } = req.query;
    const stats = await ReportService.getReportStats(city);
    res.json({ data: stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/admin/duplicates/groups", authenticate, authorize(["admin", "moderator"]), async (req, res) => {
  try {
    const { city } = req.query;
    const groups = await DuplicateDetectionService.getDuplicateGroups(city);
    res.json({
      data: groups,
      count: groups.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/admin/pending/moderations", authenticate, authorize(["admin", "moderator"]), async (req, res) => {
  try {
    const { city, category, page, limit, sortBy, sortOrder } = req.query;
    const result = await ReportModerationService.getPendingModerations({
      city,
      category,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/admin/moderations", authenticate, authorize(["admin", "moderator"]), async (req, res) => {
  try {
    const { action, startDate, endDate, page, limit } = req.query;
    const result = await ReportModerationService.getModerationsByModerator(
      req.user.id,
      {
        action,
        startDate,
        endDate,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
      }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/admin/moderation-stats", authenticate, authorize(["admin", "moderator"]), async (req, res) => {
  try {
    const { startDate, endDate, city } = req.query;
    const stats = await ReportModerationService.getModerationStats({
      startDate,
      endDate,
      city,
    });
    res.json({ data: stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post("/admin/bulk-moderate", authenticate, authorize(["admin", "moderator"]), async (req, res) => {
  try {
    const { reportIds, action, reason, notes } = req.body;
    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ message: "reportIds must be a non-empty array" });
    }
    const result = await ReportModerationService.bulkModerateReports(
      reportIds,
      req.user.id,
      {
        action,
        reason,
        notes,
      }
    );
    res.json({
      message: "Bulk moderation completed",
      data: result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.get("/ranked/helpful", async (req, res) => {
  try {
    const { city, category, limit } = req.query;
    const reports = await CredibilityService.getMostHelpfulReports({
      city,
      category,
      limit: parseInt(limit) || 10,
    });
    res.json({ data: reports });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/ranked/trending", async (req, res) => {
  try {
    const { city, category, hours, limit } = req.query;
    const reports = await CredibilityService.getTrendingReports({
      city,
      category,
      hours: parseInt(hours) || 24,
      limit: parseInt(limit) || 10,
    });
    res.json({ data: reports });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/city/:city", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await ReportService.getReportsByCity(req.params.city, page, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/category/:category", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await ReportService.getReportsByCategory(
      req.params.category,
      page,
      limit
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/nearby/:latitude/:longitude", async (req, res) => {
  try {
    const { latitude, longitude } = req.params;
    const radiusKm = req.query.radius || 10;
    const nearby = await ReportService.getNearbyReports(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radiusKm)
    );
    res.json(nearby);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post("/", authenticate, async (req, res) => {
  try {
    const report = await ReportService.createReport(req.user.id, req.body);
    const potentialDuplicates = await DuplicateDetectionService.findPotentialDuplicates(report);
    res.status(201).json({
      message: "Report created successfully",
      data: report,
      potentialDuplicates: potentialDuplicates.slice(0, 3),
      duplicateDetected: potentialDuplicates.length > 0,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.get("/", async (req, res) => {
  try {
    const { city, category, status, page, limit, sortBy, sortOrder } = req.query;
    const filters = {
      city,
      category,
      status: status || "active",
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
    };
    const result = await ReportService.getAllReports(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const report = await ReportService.getReportById(req.params.id);
    const voteStats = await CredibilityService.getVoteStatistics(report.id);
    res.json({
      data: report,
      voteStatistics: voteStats,
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});
router.post("/:id/vote", authenticate, async (req, res) => {
  try {
    const { voteType } = req.body;
    const result = await CredibilityService.submitVote(req.params.id, req.user.id, voteType);
    res.json({
      message: result.message,
      data: result.vote,
    });
  } catch (error) {
    const statusCode = error.message.includes("not found") ? 404 : 400;
    res.status(statusCode).json({ message: error.message });
  }
});
router.get("/:id/votes", async (req, res) => {
  try {
    const stats = await CredibilityService.getVoteStatistics(req.params.id);
    res.json({ data: stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/user/:userId/votes", async (req, res) => {
  try {
    const { page, limit, voteType } = req.query;
    const result = await CredibilityService.getUserVotes(req.params.userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      voteType,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/:id/duplicates", async (req, res) => {
  try {
    const duplicates = await DuplicateDetectionService.getDuplicateDetails(req.params.id);
    res.json(duplicates);
  } catch (error) {
    res.status(error.message.includes("not found") ? 404 : 500).json({
      message: error.message,
    });
  }
});
router.post("/:id/merge-duplicate", authenticate, authorize(["admin", "moderator"]), async (req, res) => {
  try {
    const { mainReportId } = req.body;
    if (!mainReportId) {
      return res.status(400).json({ message: "mainReportId is required" });
    }
    const result = await DuplicateDetectionService.mergeDuplicates(
      req.params.id,
      mainReportId
    );
    res.json({
      message: "Report marked as duplicate successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.post("/:id/moderate", authenticate, authorize(["admin", "moderator"]), async (req, res) => {
  try {
    const { action, reason, notes } = req.body;
    const moderation = await ReportModerationService.recordModerationAction(
      req.params.id,
      req.user.id,
      {
        action,
        reason,
        notes,
      }
    );
    res.json({
      message: "Moderation action recorded successfully",
      data: moderation,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.get("/:id/moderation-history", authenticate, authorize(["admin", "moderator"]), async (req, res) => {
  try {
    const history = await ReportModerationService.getModerationHistory(req.params.id);
    res.json({ data: history });
  } catch (error) {
    res.status(error.message.includes("No moderation") ? 404 : 500).json({
      message: error.message,
    });
  }
});
module.exports = router;

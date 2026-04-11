const express = require("express");
const IncidentService = require("../services/IncidentService");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const incident = await IncidentService.createIncident(req.user.id, req.body);
    res.status(201).json({
      message: "Incident created successfully",
      data: incident,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { city, type, severity, status, page, limit, sortBy, sortOrder } = req.query;
    const filters = {
      city,
      type,
      severity,
      status: status || "active",
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
    };

    const result = await IncidentService.getAllIncidents(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/city/:city", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await IncidentService.getIncidentsByCity(
      req.params.city,
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
    const nearby = await IncidentService.getNearbyIncidents(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radiusKm)
    );
    res.json({ data: nearby });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const incident = await IncidentService.getIncidentById(req.params.id);
    res.json({ data: incident });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

router.patch("/:id", authenticate, async (req, res) => {
  try {
    const updated = await IncidentService.updateIncident(
      parseInt(req.params.id),
      req.user.id,
      req.user.role,
      req.body
    );
    res.json({
      message: "Incident updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(error.message.includes("Unauthorized") ? 403 : 400).json({
      message: error.message,
    });
  }
});

router.patch("/:id/status", authenticate, authorize(["admin", "moderator"]), async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const result = await IncidentService.updateIncidentStatus(
      parseInt(req.params.id),
      req.user.id,
      req.user.role,
      status,
      reason
    );
    res.json({
      message: "Incident status updated successfully",
      data: result,
    });
  } catch (error) {
    res.status(
      error.message.includes("Unauthorized") ? 403 : 
      error.message.includes("not found") ? 404 : 400
    ).json({
      message: error.message,
    });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    await IncidentService.deleteIncident(
      parseInt(req.params.id),
      req.user.id,
      req.user.role
    );
    res.json({ message: "Incident deleted successfully" });
  } catch (error) {
    res.status(
      error.message.includes("Unauthorized") ? 403 : 
      error.message.includes("not found") ? 404 : 400
    ).json({
      message: error.message,
    });
  }
});

router.get("/:id/history", async (req, res) => {
  try {
    const history = await IncidentService.getStatusHistory(parseInt(req.params.id));
    res.json({ data: history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get statistics
router.get("/statistics/all", async (req, res) => {
  try {
    const { city } = req.query;
    const stats = await IncidentService.getStatistics(city);
    res.json({ data: stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get("/activity/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const activity = await IncidentService.getRecentActivity(limit);
    res.json({ data: activity });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

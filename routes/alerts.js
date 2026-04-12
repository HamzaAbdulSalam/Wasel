const express = require("express");
const AlertService = require("../services/AlertService");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create alert subscription
router.post("/subscriptions", async (req, res) => {
  try {
    const subscription = await AlertService.createSubscription(req.user.id, req.body);
    res.status(201).json({
      message: "Alert subscription created successfully",
      data: subscription,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user's alert subscriptions
router.get("/subscriptions", async (req, res) => {
  try {
    const subscriptions = await AlertService.getUserSubscriptions(req.user.id);
    res.json({
      message: "Subscriptions retrieved successfully",
      data: subscriptions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update alert subscription
router.put("/subscriptions/:id", async (req, res) => {
  try {
    const subscription = await AlertService.updateSubscription(
      req.params.id,
      req.user.id,
      req.body
    );
    res.json({
      message: "Subscription updated successfully",
      data: subscription,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete alert subscription
router.delete("/subscriptions/:id", async (req, res) => {
  try {
    await AlertService.deleteSubscription(req.params.id, req.user.id);
    res.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Deactivate alert subscription
router.patch("/subscriptions/:id/deactivate", async (req, res) => {
  try {
    const subscription = await AlertService.deactivateSubscription(req.params.id, req.user.id);
    res.json({
      message: "Subscription deactivated successfully",
      data: subscription,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user's alerts
router.get("/", async (req, res) => {
  try {
    const { page, limit, isRead } = req.query;
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      isRead: isRead === "true" ? true : isRead === "false" ? false : undefined,
    };

    const result = await AlertService.getUserAlerts(req.user.id, options);
    res.json({
      message: "Alerts retrieved successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark alert as read
router.patch("/:id/read", async (req, res) => {
  try {
    const alert = await AlertService.markAlertAsRead(req.params.id, req.user.id);
    res.json({
      message: "Alert marked as read",
      data: alert,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get unread alert count
router.get("/unread/count", async (req, res) => {
  try {
    const count = await AlertService.getUnreadAlertCount(req.user.id);
    res.json({
      message: "Unread count retrieved successfully",
      data: { count },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
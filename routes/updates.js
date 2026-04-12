const express = require("express");
const UpdateService = require("../services/UpdateService");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Updates routes are available",
  });
});

router.post("/", authenticate, async (req, res) => {
  try {
    const update = await UpdateService.createUpdate({
      ...req.body,
      userId: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: update,
    });
  } catch (error) {
    res.status(501).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/city/:city", async (req, res) => {
  try {
    const updates = await UpdateService.getUpdatesByCity(req.params.city);

    res.json({
      success: true,
      data: updates,
    });
  } catch (error) {
    res.status(501).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const updates = await UpdateService.getAllUpdates();

    res.json({
      success: true,
      data: updates,
    });
  } catch (error) {
    res.status(501).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const update = await UpdateService.getUpdateById(req.params.id);

    res.json({
      success: true,
      data: update,
    });
  } catch (error) {
    res.status(501).json({
      success: false,
      message: error.message,
    });
  }
});

router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const update = await UpdateService.updateStatus(req.params.id, req.body.status);

    res.json({
      success: true,
      data: update,
    });
  } catch (error) {
    res.status(501).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const UpdateService = require("../services/UpdateService");
const CheckpointService = require("../services/CheckpointService");

const router = express.Router();

// Get all hazards
router.get("/hazards", async (req, res) => {
  try {
    res.status(503).json({ message: "Database removed: Feature not available" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create an update (requires authentication)
router.post("/create", authenticate, async (req, res) => {
  try {
    const updateData = {
      userId: req.user.id,
      hazardId: req.body.hazardId,
      city: req.body.city,
      description: req.body.description,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
    };

    const update = await UpdateService.createUpdate(updateData);
    res.status(201).json({ message: "Update created successfully", update });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get updates by city
router.get("/city/:city", async (req, res) => {
  try {
    const updates = await UpdateService.getUpdatesByCity(req.params.city);
    res.json(updates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all updates
router.get("/all", async (req, res) => {
  try {
    const updates = await UpdateService.getAllUpdates();
    res.json(updates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get update by ID with checkpoints
router.get("/:id", async (req, res) => {
  try {
    const update = await UpdateService.getUpdateById(req.params.id);
    if (!update) return res.status(404).json({ message: "Update not found" });

    const checkpoints = await CheckpointService.getCheckpointsByUpdateId(
      req.params.id,
    );
    res.json({ update, checkpoints });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update status (admin only)
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const updated = await UpdateService.updateStatus(
        req.params.id,
        req.body.status,
      );
      if (!updated)
        return res.status(404).json({ message: "Update not found" });
      res.json({ message: "Status updated", update: updated });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Add checkpoint (requires authentication)
router.post("/:id/checkpoint", authenticate, async (req, res) => {
  try {
    const checkpointData = {
      updateId: parseInt(req.params.id),
      checkpointType: req.body.checkpointType,
      description: req.body.description,
      loggedBy: req.user.id,
    };

    const checkpoint = await CheckpointService.addCheckpoint(checkpointData);
    res.status(201).json({ message: "Checkpoint added", checkpoint });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get checkpoints for update
router.get("/:id/checkpoints", async (req, res) => {
  try {
    const checkpoints = await CheckpointService.getCheckpointsByUpdateId(
      req.params.id,
    );
    res.json(checkpoints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

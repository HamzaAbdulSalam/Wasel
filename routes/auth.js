const express = require("express");
const AuthService = require("../services/AuthService");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const user = await AuthService.register(req.body);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


router.post("/login", async (req, res) => {
  try {
    const result = await AuthService.login(req.body);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await AuthService.refreshAccessToken(refreshToken);
    res.json({
      message: "Token refreshed successfully",
      ...tokens,
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});
router.get("/profile", authenticate, async (req, res) => {
  try {
    const user = await AuthService.getUserById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch profile" });
  }
});

router.get("/admin", authenticate, authorize("admin"), (req, res) => {
  res.json({ message: "Welcome, admin!" });
});

module.exports = router;

const express = require("express");
const authRoutes = require("./routes/auth");
const incidentsRoutes = require("./routes/incidents");

let updatesRoutes;
try {
  updatesRoutes = require("./routes/updates");
} catch (error) {
  console.error("Error loading updates routes:", error.message);
}

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/incidents", incidentsRoutes);
if (updatesRoutes) {
  app.use("/updates", updatesRoutes);
  console.log("Updates routes loaded");
} else {
  console.log("Updates routes not loaded");
  // Add a test route
  app.get("/updates/test", (req, res) => {
    res.json({ message: "Test route working" });
  });
}

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

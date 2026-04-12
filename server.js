const express = require("express");
const authRoutes = require("./routes/auth");


let updatesRoutes;
try {
  updatesRoutes = require("./routes/updates");
} catch (error) {
  console.error("Error loading updates routes:", error.message);
}

const incidentsRoutes = require("./routes/incidents");
const reportsRoutes = require("./routes/reports");
const routesRoutes = require("./routes/routes");
const alertsRoutes = require("./routes/alerts");
const prisma = require("./utils/prisma");


const app = express();

// Middleware
app.use(express.json());

// Database connection verification
prisma
  .$connect()
  .then(() => console.log("✓ Database connected"))
  .catch((err) => {
    console.error("✗ Database connection failed:", err.message);
    process.exit(1);
  });

// Routes
app.use("/auth", authRoutes);

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

app.use("/incidents", incidentsRoutes);
app.use("/reports", reportsRoutes);
app.use("/routes", routesRoutes);
app.use("/alerts", alertsRoutes);


app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

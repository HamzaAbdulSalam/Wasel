const express = require("express");
const authRoutes = require("./routes/auth");
const incidentsRoutes = require("./routes/incidents");
const reportsRoutes = require("./routes/reports");
const routesRoutes = require("./routes/routes");
const prisma = require("./utils/prisma");

const app = express();

// Middleware
app.use(express.json());
if (process.env.DATABASE_URL) {
  prisma
    .$connect()
    .then(() => console.log("✓ Database connected"))
    .catch((err) => {
      console.error("✗ Database connection failed:", err.message);
    });
} else {
  console.warn("DATABASE_URL is not set; skipping database connection check");
}

const v1Router = express.Router();
v1Router.use("/auth", authRoutes);
v1Router.use("/updates", updatesRoutes);
v1Router.use("/incidents", incidentsRoutes);
v1Router.use("/reports", reportsRoutes);
v1Router.use("/routes", routesRoutes);
v1Router.use("/alerts", alertsRoutes);
app.use("/api/v1", v1Router);

app.get("/", (req, res) => {
  res.json({
    service: "Wasel Palestine API",
    version: "v1",
    docs: "/api/v1",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

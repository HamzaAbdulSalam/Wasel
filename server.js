require("dotenv").config();
const express = require("express");
const authRoutes = require("./routes/auth");
const updatesRoutes = require("./routes/updates");
const incidentsRoutes = require("./routes/incidents");
const reportsRoutes = require("./routes/reports");
const routesRoutes = require("./routes/routes");
const alertsRoutes = require("./routes/alerts");
const prisma = require("./utils/prisma");
const app = express();
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
app.use("/auth", authRoutes);
app.use("/updates", updatesRoutes);
console.log("Updates routes loaded");
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
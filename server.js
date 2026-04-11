const express = require("express");
const authRoutes = require("./routes/auth");
const incidentsRoutes = require("./routes/incidents");
const reportsRoutes = require("./routes/reports");
const routesRoutes = require("./routes/routes");
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
app.use("/incidents", incidentsRoutes);
app.use("/reports", reportsRoutes);
app.use("/routes", routesRoutes);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

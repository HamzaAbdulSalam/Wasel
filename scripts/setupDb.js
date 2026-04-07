require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || "wasel",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "password",
});

const initSql = fs.readFileSync(
  path.join(__dirname, "..", "db", "init.sql"),
  "utf8",
);

(async () => {
  try {
    console.log("Connecting to Postgres...");
    await pool.connect();
    console.log("Running database setup script...");
    await pool.query(initSql);
    console.log("Database setup completed successfully.");
  } catch (error) {
    console.error("Database setup failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

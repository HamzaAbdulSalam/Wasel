require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || "wasel",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "password",
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};

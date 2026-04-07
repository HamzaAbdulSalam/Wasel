require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || "wasel",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "password",
});

(async () => {
  try {
    const res = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='auth_users' ORDER BY ordinal_position",
    );
    console.log(
      "columns:",
      res.rows.map((r) => r.column_name),
    );
    const test = await pool.query(
      "SELECT id FROM auth_users WHERE email = $1 OR username = $2",
      ["signin@example.com", "signinuser"],
    );
    console.log("test select rowCount:", test.rowCount);
  } catch (error) {
    console.error("error:", error.message);
  } finally {
    await pool.end();
  }
})();

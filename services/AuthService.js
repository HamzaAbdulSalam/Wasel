const User = require("../models/User");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const db = require("../utils/db");

class AuthService {
  static async register(userData) {
    // Validate input
    const schema = Joi.object({
      username: Joi.string().min(3).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      role: Joi.string().valid("user", "admin").default("user"),
    });

    const { error, value } = schema.validate(userData);
    if (error) throw new Error(error.details[0].message);

    // Check if user exists
    const existingResult = await db.query(
      "SELECT id FROM auth_users WHERE email = $1 OR username = $2",
      [value.email, value.username],
    );
    if (existingResult.rowCount > 0) throw new Error("User already exists");

    // Hash password
    const hashedPassword = await User.hashPassword(value.password);

    // Create user in database
    const insertResult = await db.query(
      "INSERT INTO auth_users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role",
      [value.username, value.email, hashedPassword, value.role],
    );

    return insertResult.rows[0];
  }

  static async login(credentials) {
    // Validate input
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    });

    const { error, value } = schema.validate(credentials);
    if (error) throw new Error(error.details[0].message);

    // Find user
    const result = await db.query(
      "SELECT id, username, email, password, role FROM auth_users WHERE email = $1",
      [value.email],
    );
    const user = result.rows[0];
    if (!user) throw new Error("Invalid credentials");

    // Check password
    const userInstance = new User(
      user.id,
      user.username,
      user.email,
      user.password,
      user.role,
    );
    const isValid = await userInstance.comparePassword(value.password);
    if (!isValid) throw new Error("Invalid credentials");

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1h" },
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  static async getUserById(id) {
    const result = await db.query(
      "SELECT id, username, email, role FROM auth_users WHERE id = $1",
      [id],
    );
    return result.rows[0] || null;
  }
}

module.exports = AuthService;

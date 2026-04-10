const Joi = require("joi");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const JWTUtils = require("../utils/jwt");

const prisma = new PrismaClient();

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

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: value.email },
          { username: value.username }
        ]
      }
    });

    if (existingUser) {
      throw new Error("User with this email or username already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(value.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: value.username,
        email: value.email,
        password: hashedPassword,
        role: value.role || "user"
      }
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
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
    const user = await prisma.user.findUnique({
      where: { email: value.email }
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(value.password, user.password);
    if (!passwordMatch) {
      throw new Error("Invalid email or password");
    }

    // Generate JWT token using JWTUtils
    const token = JWTUtils.generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return {
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
  }

  static async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
  }
}

module.exports = AuthService;

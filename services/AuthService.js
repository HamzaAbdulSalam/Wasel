const Joi = require("joi");

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

    throw new Error("Database removed: Feature not available");
  }

  static async login(credentials) {
    // Validate input
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    });

    const { error, value } = schema.validate(credentials);
    if (error) throw new Error(error.details[0].message);

    throw new Error("Database removed: Feature not available");
  }

  static async getUserById(id) {
    throw new Error("Database removed: Feature not available");
  }
}

module.exports = AuthService;

const Joi = require("joi");

class UpdateService {
  static async createUpdate(updateData) {
    // Validate input
    const schema = Joi.object({
      userId: Joi.number().required(),
      hazardId: Joi.number().required(),
      city: Joi.string().required(),
      description: Joi.string().required(),
      latitude: Joi.number().optional(),
      longitude: Joi.number().optional(),
    });

    const { error, value } = schema.validate(updateData);
    if (error) throw new Error(error.details[0].message);

    throw new Error("Database removed: Feature not available");
  }

  static async getUpdatesByCity(city) {
    throw new Error("Database removed: Feature not available");
  }

  static async getAllUpdates() {
    throw new Error("Database removed: Feature not available");
  }

  static async getUpdateById(id) {
    throw new Error("Database removed: Feature not available");
  }

  static async updateStatus(id, status) {
    throw new Error("Database removed: Feature not available");
  }
}

module.exports = UpdateService;

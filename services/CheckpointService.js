const Joi = require("joi");

class CheckpointService {
  static async addCheckpoint(checkpointData) {
    // Validate input
    const schema = Joi.object({
      updateId: Joi.number().required(),
      checkpointType: Joi.string().required(),
      description: Joi.string().optional(),
      loggedBy: Joi.number().required(),
    });

    const { error, value } = schema.validate(checkpointData);
    if (error) throw new Error(error.details[0].message);

    throw new Error("Database removed: Feature not available");
  }

  static async getCheckpointsByUpdateId(updateId) {
    throw new Error("Database removed: Feature not available");
  }

  static async getCheckpointById(id) {
    throw new Error("Database removed: Feature not available");
  }
}

module.exports = CheckpointService;

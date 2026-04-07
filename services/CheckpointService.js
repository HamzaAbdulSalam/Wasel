const Checkpoint = require("../models/Checkpoint");
const db = require("../utils/db");
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

    // Verify update exists
    const updateResult = await db.query(
      "SELECT id FROM updates WHERE id = $1",
      [value.updateId],
    );
    if (updateResult.rowCount === 0) throw new Error("Update not found");

    // Create checkpoint
    const result = await db.query(
      `INSERT INTO checkpoints (update_id, checkpoint_type, description, logged_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, update_id, checkpoint_type, description, logged_by, created_at`,
      [value.updateId, value.checkpointType, value.description, value.loggedBy],
    );

    return result.rows[0];
  }

  static async getCheckpointsByUpdateId(updateId) {
    const result = await db.query(
      `SELECT c.id, c.update_id, c.checkpoint_type, c.description, c.logged_by, au.username, c.created_at
       FROM checkpoints c
       JOIN auth_users au ON c.logged_by = au.id
       WHERE c.update_id = $1
       ORDER BY c.created_at ASC`,
      [updateId],
    );

    return result.rows;
  }

  static async getCheckpointById(id) {
    const result = await db.query(
      `SELECT c.*, au.username
       FROM checkpoints c
       JOIN auth_users au ON c.logged_by = au.id
       WHERE c.id = $1`,
      [id],
    );

    return result.rows[0] || null;
  }
}

module.exports = CheckpointService;

const Update = require("../models/Update");
const db = require("../utils/db");
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

    // Verify hazard exists
    const hazardResult = await db.query(
      "SELECT id FROM hazards WHERE id = $1",
      [value.hazardId],
    );
    if (hazardResult.rowCount === 0) throw new Error("Hazard not found");

    // Create update
    const result = await db.query(
      `INSERT INTO updates (user_id, hazard_id, city, description, latitude, longitude, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING id, user_id, hazard_id, city, description, latitude, longitude, status, created_at`,
      [
        value.userId,
        value.hazardId,
        value.city,
        value.description,
        value.latitude,
        value.longitude,
      ],
    );

    return result.rows[0];
  }

  static async getUpdatesByCity(city) {
    const result = await db.query(
      `SELECT u.id, u.user_id, u.hazard_id, h.name as hazard_name, u.city, u.description, 
              u.latitude, u.longitude, u.status, au.username, u.created_at
       FROM updates u
       JOIN auth_users au ON u.user_id = au.id
       JOIN hazards h ON u.hazard_id = h.id
       WHERE u.city = $1
       ORDER BY u.created_at DESC`,
      [city],
    );

    return result.rows;
  }

  static async getAllUpdates() {
    const result = await db.query(
      `SELECT u.id, u.user_id, u.hazard_id, h.name as hazard_name, u.city, u.description, 
              u.latitude, u.longitude, u.status, au.username, u.created_at
       FROM updates u
       JOIN auth_users au ON u.user_id = au.id
       JOIN hazards h ON u.hazard_id = h.id
       ORDER BY u.created_at DESC`,
    );

    return result.rows;
  }

  static async getUpdateById(id) {
    const result = await db.query(
      `SELECT u.*, h.name as hazard_name, au.username
       FROM updates u
       JOIN auth_users au ON u.user_id = au.id
       JOIN hazards h ON u.hazard_id = h.id
       WHERE u.id = $1`,
      [id],
    );

    return result.rows[0] || null;
  }

  static async updateStatus(id, status) {
    const result = await db.query(
      "UPDATE updates SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id],
    );

    return result.rows[0] || null;
  }
}

module.exports = UpdateService;

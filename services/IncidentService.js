const IncidentRepository = require("../repos/IncidentRepository");
const IncidentStatusRepository = require("../repos/IncidentStatusRepository");
const RoadIncident = require("../models/RoadIncident");
const IncidentStatus = require("../models/IncidentStatus");
const Joi = require("joi");

class IncidentService {
  // Validation schema
  getValidationSchema() {
    return Joi.object({
      title: Joi.string().min(3).max(255).required(),
      description: Joi.string().min(10).max(2000).required(),
      type: Joi.string()
        .valid("closure", "delay", "accident", "weather_hazard", "maintenance", "other")
        .required(),
      severity: Joi.string()
        .valid("low", "medium", "high", "critical")
        .default("medium"),
      city: Joi.string().required(),
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
    });
  }

  // Create a new incident
  async createIncident(userId, incidentData) {
    // Validate
    const schema = this.getValidationSchema();
    const { error, value } = schema.validate(incidentData);
    if (error) throw new Error(error.details[0].message);

    // Create incident
    const incident = new RoadIncident({
      ...value,
      userId,
    });

    if (!incident.isValid()) {
      throw new Error("Invalid incident data");
    }

    const created = await IncidentRepository.create(incident);
    return created;
  }

  // Get incident by ID
  async getIncidentById(id) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) {
      throw new Error("Incident not found");
    }
    return incident;
  }

  // Get all incidents with filtering
  async getAllIncidents(filters = {}) {
    return await IncidentRepository.findAll(filters);
  }

  // Get incidents by city
  async getIncidentsByCity(city, page = 1, limit = 10) {
    return await IncidentRepository.findByCity(city, page, limit);
  }

  // Get nearby incidents
  async getNearbyIncidents(latitude, longitude, radiusKm = 10) {
    const nearby = await IncidentRepository.findNearby(latitude, longitude, radiusKm);
    return nearby;
  }

  // Update incident (only creator or admin can update)
  async updateIncident(id, userId, userRole, updateData) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) {
      throw new Error("Incident not found");
    }

    // Check permission
    if (incident.userId !== userId && userRole !== "admin") {
      throw new Error("Unauthorized: Only creator or admin can update");
    }

    const updated = await IncidentRepository.update(id, updateData);
    return updated;
  }

  // Update incident status (only admin/moderator)
  async updateIncidentStatus(id, userId, userRole, newStatus, reason = null) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) {
      throw new Error("Incident not found");
    }

    // Check permission
    if (!["admin", "moderator"].includes(userRole)) {
      throw new Error("Unauthorized: Only admin/moderator can update status");
    }

    // Validate status transition
    const statusHistory = new IncidentStatus({
      previousStatus: incident.status,
      newStatus,
    });

    if (!statusHistory.isStatusTransitionValid()) {
      throw new Error(`Invalid transition from ${incident.status} to ${newStatus}`);
    }

    // Update incident status
    const updated = await IncidentRepository.updateStatus(id, newStatus);

    // Record status change
    const history = await IncidentStatusRepository.create({
      incidentId: id,
      previousStatus: incident.status,
      newStatus,
      reason,
      userId,
    });

    return {
      incident: updated,
      history,
    };
  }

  // Verify incident (moderator/admin)
  async verifyIncident(id, userId, userRole, reason = null) {
    if (!["admin", "moderator"].includes(userRole)) {
      throw new Error("Unauthorized: Only admin/moderator can verify");
    }

    return this.updateIncidentStatus(id, userId, userRole, "verified", reason || "Verified by moderator");
  }

  // Close incident (admin only)
  async closeIncident(id, userId, userRole, reason = null) {
    if (userRole !== "admin") {
      throw new Error("Unauthorized: Only admin can close incidents");
    }

    return this.updateIncidentStatus(id, userId, userRole, "closed", reason || "Closed by admin");
  }

  // Resolve incident (admin/moderator)
  async resolveIncident(id, userId, userRole, reason = null) {
    if (!["admin", "moderator"].includes(userRole)) {
      throw new Error("Unauthorized: Only admin/moderator can resolve");
    }

    return this.updateIncidentStatus(id, userId, userRole, "resolved", reason || "Resolved");
  }

  // Delete incident (only creator or admin)
  async deleteIncident(id, userId, userRole) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) {
      throw new Error("Incident not found");
    }

    // Check permission
    if (incident.userId !== userId && userRole !== "admin") {
      throw new Error("Unauthorized: Only creator or admin can delete");
    }

    return await IncidentRepository.delete(id);
  }

  // Get status history
  async getStatusHistory(incidentId) {
    return await IncidentStatusRepository.findByIncidentId(incidentId);
  }

  // Get statistics
  async getStatistics(city = null) {
    return await IncidentRepository.getStatistics(city);
  }

  // Get recent activity
  async getRecentActivity(limit = 20) {
    return await IncidentStatusRepository.getRecentChanges(limit);
  }
}

module.exports = new IncidentService();

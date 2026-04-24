const IncidentRepository = require("../repos/IncidentRepository");
const IncidentStatusRepository = require("../repos/IncidentStatusRepository");
const AlertService = require("./AlertService");
const RoadIncident = require("../models/RoadIncident");
const IncidentStatus = require("../models/IncidentStatus");
const Joi = require("joi");
class IncidentService {
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
  async createIncident(userId, incidentData) {
    const schema = this.getValidationSchema();
    const { error, value } = schema.validate(incidentData);
    if (error) throw new Error(error.details[0].message);
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
  async getIncidentById(id) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) {
      throw new Error("Incident not found");
    }
    return incident;
  }
  async getAllIncidents(filters = {}) {
    return await IncidentRepository.findAll(filters);
  }
  async getIncidentsByCity(city, page = 1, limit = 10) {
    return await IncidentRepository.findByCity(city, page, limit);
  }
  async getNearbyIncidents(latitude, longitude, radiusKm = 10, page = 1, limit = 10) {
    const nearby = await IncidentRepository.findNearby(latitude, longitude, radiusKm, page, limit);
    return nearby;
  }
  async updateIncident(id, userId, userRole, updateData) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) {
      throw new Error("Incident not found");
    }
    if (incident.userId !== userId && userRole !== "admin") {
      throw new Error("Unauthorized: Only creator or admin can update");
    }
    const updated = await IncidentRepository.update(id, updateData);
    return updated;
  }
  async updateIncidentStatus(id, userId, userRole, newStatus, reason = null) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) {
      throw new Error("Incident not found");
    }
    if (!["admin", "moderator"].includes(userRole)) {
      throw new Error("Unauthorized: Only admin/moderator can update status");
    }
    const statusHistory = new IncidentStatus({
      previousStatus: incident.status,
      newStatus,
    });
    if (!statusHistory.isStatusTransitionValid()) {
      throw new Error(`Invalid transition from ${incident.status} to ${newStatus}`);
    }
    const updated = await IncidentRepository.updateStatus(id, newStatus);
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
  async verifyIncident(id, userId, userRole, reason = null) {
    if (!["admin", "moderator"].includes(userRole)) {
      throw new Error("Unauthorized: Only admin/moderator can verify");
    }
    const result = await this.updateIncidentStatus(id, userId, userRole, "verified", reason || "Verified by moderator");
    try {
      await AlertService.triggerAlertsForIncident(result.incident);
    } catch (alertError) {
      console.error("Error triggering alerts:", alertError);
    }
    return result;
  }
  async closeIncident(id, userId, userRole, reason = null) {
    if (userRole !== "admin") {
      throw new Error("Unauthorized: Only admin can close incidents");
    }
    return this.updateIncidentStatus(id, userId, userRole, "closed", reason || "Closed by admin");
  }
  async resolveIncident(id, userId, userRole, reason = null) {
    if (!["admin", "moderator"].includes(userRole)) {
      throw new Error("Unauthorized: Only admin/moderator can resolve");
    }
    return this.updateIncidentStatus(id, userId, userRole, "resolved", reason || "Resolved");
  }
  async deleteIncident(id, userId, userRole) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) {
      throw new Error("Incident not found");
    }
    if (incident.userId !== userId && userRole !== "admin") {
      throw new Error("Unauthorized: Only creator or admin can delete");
    }
    return await IncidentRepository.delete(id);
  }
  async getStatusHistory(incidentId, page = 1, limit = 10) {
    return await IncidentStatusRepository.findByIncidentId(incidentId, page, limit);
  }
  async getStatistics(city = null) {
    return await IncidentRepository.getStatistics(city);
  }
  async getRecentActivity(page = 1, limit = 20) {
    return await IncidentStatusRepository.getRecentChanges(page, limit);
  }
}
module.exports = new IncidentService();

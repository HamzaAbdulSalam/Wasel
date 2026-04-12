const prisma = require("../utils/prisma");

class IncidentStatusRepository {
  // Create a status history entry
  async create(data) {
    return await prisma.incidentStatus.create({
      data: {
        incidentId: data.incidentId,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus,
        reason: data.reason,
        userId: data.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Get status history for an incident
  async findByIncidentId(incidentId) {
    return await prisma.incidentStatus.findMany({
      where: { incidentId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Get recent status changes
  async getRecentChanges(limit = 20) {
    return await prisma.incidentStatus.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        incident: {
          select: {
            id: true,
            title: true,
            city: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Get status changes by user
  async findByUserId(userId) {
    return await prisma.incidentStatus.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        incident: {
          select: {
            id: true,
            title: true,
            city: true,
          },
        },
      },
    });
  }
}

module.exports = new IncidentStatusRepository();

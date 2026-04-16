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

  // Get status history for an incident with pagination
  async findByIncidentId(incidentId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      prisma.incidentStatus.findMany({
        where: { incidentId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.incidentStatus.count({ where: { incidentId } }),
    ]);

    return {
      data: history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get recent status changes with pagination
  async getRecentChanges(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [changes, total] = await Promise.all([
      prisma.incidentStatus.findMany({
        skip,
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
      }),
      prisma.incidentStatus.count(),
    ]);

    return {
      data: changes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
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

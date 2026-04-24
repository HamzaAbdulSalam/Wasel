const prisma = require("../utils/prisma");

class IncidentRepository {
  getListUserSelect() {
    return {
      id: true,
      username: true,
    };
  }

  // Create a new incident
  async create(data) {
    return await prisma.roadIncident.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        severity: data.severity || "medium",
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        userId: data.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  // Get incident by ID
  async findById(id) {
    return await prisma.roadIncident.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        statusHistories: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });
  }

  // Get all incidents with filtering, sorting, and pagination
  async findAll(filters = {}) {
    const {
      city,
      status = "active",
      type,
      severity,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = filters;

    const skip = (page - 1) * limit;

    const where = {};
    if (city) where.city = city;
    if (status) where.status = status;
    if (type) where.type = type;
    if (severity) where.severity = severity;

    const [incidents, total] = await Promise.all([
      prisma.roadIncident.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          user: {
            select: this.getListUserSelect(),
          },
        },
      }),
      prisma.roadIncident.count({ where }),
    ]);

    return {
      data: incidents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get incidents by city
  async findByCity(city, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [incidents, total] = await Promise.all([
      prisma.roadIncident.findMany({
        where: { city },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: this.getListUserSelect(),
          },
        },
      }),
      prisma.roadIncident.count({ where: { city } }),
    ]);

    return {
      data: incidents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get active incidents near coordinates (within 10km)
  async findNearby(latitude, longitude, radiusKm = 10) {
    // Simple distance calculation using Haversine formula
    // In production, use PostGIS for better performance
    return await prisma.$queryRaw`
      SELECT 
        id, title, description, type, severity, status,
        city, latitude, longitude, "userId", "createdAt", "updatedAt",
        (6371 * 2 * ASIN(SQRT(POWER(SIN(RADIANS(latitude - ${latitude}) / 2), 2) +
        COS(RADIANS(${latitude})) * COS(RADIANS(latitude)) * POWER(SIN(RADIANS(longitude - ${longitude}) / 2), 2))))
        AS distance
      FROM "RoadIncident"
      WHERE status = 'active'
      AND (6371 * 2 * ASIN(SQRT(POWER(SIN(RADIANS(latitude - ${latitude}) / 2), 2) +
      COS(RADIANS(${latitude})) * COS(RADIANS(latitude)) * POWER(SIN(RADIANS(longitude - ${longitude}) / 2), 2))))
      <= ${radiusKm}
      ORDER BY distance ASC
    `;
  }

  // Update incident
  async update(id, data) {
    return await prisma.roadIncident.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        severity: data.severity,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  // Update incident status
  async updateStatus(id, newStatus) {
    return await prisma.roadIncident.update({
      where: { id },
      data: { status: newStatus },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  // Delete incident
  async delete(id) {
    return await prisma.roadIncident.delete({
      where: { id },
    });
  }

  // Get statistics
  async getStatistics(city = null) {
    const where = city ? { city } : {};

    const stats = await prisma.roadIncident.groupBy({
      by: ["status", "type", "severity"],
      where,
      _count: true,
    });

    return stats;
  }
}

module.exports = new IncidentRepository();

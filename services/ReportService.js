const Joi = require("joi");
const prisma = require("../utils/prisma");
const REPORT_RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 1000;
class ReportService {
  static getValidationSchema() {
    return Joi.object({
      category: Joi.string()
        .valid("traffic_jam", "accident", "hazard", "construction", "road_closure", "weather", "other")
        .required(),
      description: Joi.string()
        .min(MIN_DESCRIPTION_LENGTH)
        .max(MAX_DESCRIPTION_LENGTH)
        .required(),
      city: Joi.string().required(),
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
    });
  }
  static containsSpam(description) {
    const spamKeywords = [
      "click here",
      "buy now",
      "spam",
      "promote",
      "follow me",
      "subscribe",
      "bit.ly",
      "tinyurl",
    ];
    const lowerDesc = description.toLowerCase();
    return spamKeywords.some((keyword) => lowerDesc.includes(keyword));
  }
  static async checkRateLimit(userId) {
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW);
    const reportsCount = await prisma.report.count({
      where: {
        userId: userId,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });
    if (reportsCount >= REPORT_RATE_LIMIT) {
      throw new Error(
        `Rate limit exceeded. Maximum ${REPORT_RATE_LIMIT} reports per hour allowed.`
      );
    }
  }
  static async createReport(userId, reportData) {
    const schema = this.getValidationSchema();
    const { error, value } = schema.validate(reportData);
    if (error) throw new Error(error.details[0].message);
    await this.checkRateLimit(userId);
    if (this.containsSpam(value.description)) {
      throw new Error("Report contains spam or malicious content. Please revise.");
    }
    const report = await prisma.report.create({
      data: {
        category: value.category,
        description: value.description,
        city: value.city,
        latitude: parseFloat(value.latitude),
        longitude: parseFloat(value.longitude),
        userId: userId,
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
    return report;
  }
  static async getAllReports(filters = {}) {
    const {
      city,
      category,
      status,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = filters;
    const where = {};
    if (city) where.city = city;
    if (category) where.category = category;
    if (status) where.status = status;
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          votes: true,
          moderations: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          [sortBy]: sortOrder.toLowerCase(),
        },
        skip,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);
    return {
      data: reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  static async getReportsByCity(city, page = 1, limit = 10) {
    return this.getAllReports({
      city,
      page,
      limit,
      status: "active",
    });
  }
  static async getReportsByCategory(category, page = 1, limit = 10) {
    return this.getAllReports({
      category,
      page,
      limit,
      status: "active",
    });
  }
  static async getNearbyReports(latitude, longitude, radiusKm = 10) {
    const reports = await prisma.report.findMany({
      where: {
        status: "active",
        isDuplicate: false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        votes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });
    const nearbyReports = reports.filter((report) => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        parseFloat(report.latitude),
        parseFloat(report.longitude)
      );
      return distance <= radiusKm;
    });
    return {
      data: nearbyReports,
      count: nearbyReports.length,
    };
  }
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  static async getReportById(id) {
    const report = await prisma.report.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        moderations: {
          include: {
            moderator: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    if (!report) {
      throw new Error("Report not found");
    }
    return report;
  }
  static async updateReportStatus(reportId, newStatus, reason = null) {
    const validStatuses = ["active", "verified", "flagged", "rejected", "resolved"];
    if (!validStatuses.includes(newStatus)) {
      throw new Error("Invalid status");
    }
    const report = await prisma.report.update({
      where: { id: parseInt(reportId) },
      data: {
        status: newStatus,
      },
    });
    return report;
  }
  static async markAsDuplicate(reportId, duplicateOfId) {
    const report = await prisma.report.update({
      where: { id: parseInt(reportId) },
      data: {
        isDuplicate: true,
        duplicateOf: parseInt(duplicateOfId),
      },
    });
    return report;
  }
  static async getReportStats(city = null) {
    const where = city ? { city } : {};
    const stats = await prisma.report.groupBy({
      by: ["category", "status"],
      where,
      _count: true,
    });
    return stats;
  }
}
module.exports = ReportService;

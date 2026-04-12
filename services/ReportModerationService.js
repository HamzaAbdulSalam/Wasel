const Joi = require("joi");
const prisma = require("../utils/prisma");

class ReportModerationService {
  // Validation schema for moderation actions
  static getValidationSchema() {
    return Joi.object({
      action: Joi.string()
        .valid("flagged", "verified", "rejected", "resolved")
        .required(),
      reason: Joi.string().optional(),
      notes: Joi.string().optional(),
    });
  }

  // Record a moderation action (audit trail)
  static async recordModerationAction(reportId, moderatorId, moderationData) {
    // Validate input
    const schema = this.getValidationSchema();
    const { error, value } = schema.validate(moderationData);
    if (error) throw new Error(error.details[0].message);

    // Check if report exists
    const report = await prisma.report.findUnique({
      where: { id: parseInt(reportId) },
    });

    if (!report) {
      throw new Error("Report not found");
    }

    // Check if moderator exists and has permission
    const moderator = await prisma.user.findUnique({
      where: { id: parseInt(moderatorId) },
    });

    if (!moderator) {
      throw new Error("Moderator not found");
    }

    if (!["admin", "moderator"].includes(moderator.role)) {
      throw new Error("Insufficient permissions for moderation");
    }

    // Create moderation record
    const moderation = await prisma.reportModeration.create({
      data: {
        reportId: parseInt(reportId),
        action: value.action,
        reason: value.reason,
        notes: value.notes,
        moderatorId: parseInt(moderatorId),
      },
      include: {
        moderator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        report: true,
      },
    });

    // Update report status based on action
    await this.updateReportStatusBasedOnAction(reportId, value.action);

    return moderation;
  }

  // Update report status based on moderation action
  static async updateReportStatusBasedOnAction(reportId, action) {
    const statusMap = {
      flagged: "flagged",
      verified: "verified",
      rejected: "rejected",
      resolved: "resolved",
    };

    await prisma.report.update({
      where: { id: parseInt(reportId) },
      data: {
        status: statusMap[action],
      },
    });
  }

  // Get moderation history for a report
  static async getModerationHistory(reportId) {
    const history = await prisma.reportModeration.findMany({
      where: {
        reportId: parseInt(reportId),
      },
      include: {
        moderator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (history.length === 0) {
      throw new Error("No moderation history found for this report");
    }

    return history;
  }

  // Get all moderation actions by a specific moderator
  static async getModerationsByModerator(moderatorId, filters = {}) {
    const {
      action,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = filters;

    const where = {
      moderatorId: parseInt(moderatorId),
    };

    if (action) where.action = action;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [moderations, total] = await Promise.all([
      prisma.reportModeration.findMany({
        where,
        include: {
          report: true,
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
        skip,
        take: limit,
      }),
      prisma.reportModeration.count({ where }),
    ]);

    return {
      data: moderations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get moderation statistics
  static async getModerationStats(filters = {}) {
    const { startDate, endDate, city } = filters;

    const where = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (city) {
      where.report = {
        city: city,
      };
    }

    const stats = await prisma.reportModeration.groupBy({
      by: ["action"],
      where,
      _count: true,
    });

    const totalModerations = stats.reduce((sum, stat) => sum + stat._count, 0);

    return {
      stats: stats.map((stat) => ({
        action: stat.action,
        count: stat._count,
        percentage: ((stat._count / totalModerations) * 100).toFixed(2),
      })),
      total: totalModerations,
    };
  }

  // Get pending moderations (reports with no moderation action yet)
  static async getPendingModerations(filters = {}) {
    const { city, category, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = filters;

    const where = {
      moderations: {
        none: {},
      },
      status: "active",
    };

    if (city) where.city = city;
    if (category) where.category = category;

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

  // Bulk moderation action
  static async bulkModerateReports(reportIds, moderatorId, moderationData) {
    const results = [];
    const errors = [];

    for (const reportId of reportIds) {
      try {
        const moderation = await this.recordModerationAction(
          reportId,
          moderatorId,
          moderationData
        );
        results.push({
          reportId,
          success: true,
          moderation,
        });
      } catch (error) {
        errors.push({
          reportId,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      results,
      errors,
      successCount: results.length,
      errorCount: errors.length,
    };
  }
}

module.exports = ReportModerationService;

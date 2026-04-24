const Joi = require("joi");
const prisma = require("../utils/prisma");
const VOTE_WEIGHTS = {
  helpful: 1,
  not_helpful: -0.5,
  spam: -2,
  duplicate: -1,
};
class CredibilityService {
  static getValidationSchema() {
    return Joi.object({
      voteType: Joi.string().valid("helpful", "not_helpful", "spam", "duplicate").required(),
    });
  }
  static async submitVote(reportId, userId, voteType) {
    const schema = this.getValidationSchema();
    const { error } = schema.validate({ voteType });
    if (error) throw new Error(error.details[0].message);
    const report = await prisma.report.findUnique({
      where: { id: parseInt(reportId) },
    });
    if (!report) {
      throw new Error("Report not found");
    }
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });
    if (!user) {
      throw new Error("User not found");
    }
    if (report.userId === parseInt(userId)) {
      throw new Error("You cannot vote on your own report");
    }
    const existingVote = await prisma.reportVote.findUnique({
      where: {
        reportId_userId: {
          reportId: parseInt(reportId),
          userId: parseInt(userId),
        },
      },
    });
    if (existingVote) {
      const updatedVote = await prisma.reportVote.update({
        where: {
          id: existingVote.id,
        },
        data: {
          voteType: voteType,
        },
        include: {
          report: true,
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });
      await this.updateCredibilityScore(reportId);
      return {
        vote: updatedVote,
        message: "Vote updated successfully",
      };
    } else {
      const newVote = await prisma.reportVote.create({
        data: {
          reportId: parseInt(reportId),
          userId: parseInt(userId),
          voteType: voteType,
        },
        include: {
          report: true,
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });
      await this.updateCredibilityScore(reportId);
      return {
        vote: newVote,
        message: "Vote submitted successfully",
      };
    }
  }
  static async calculateCredibilityScore(reportId) {
    const votes = await prisma.reportVote.findMany({
      where: {
        reportId: parseInt(reportId),
      },
    });
    let score = 0;
    for (const vote of votes) {
      score += VOTE_WEIGHTS[vote.voteType] || 0;
    }
    return score;
  }
  static async updateCredibilityScore(reportId) {
    const score = await this.calculateCredibilityScore(reportId);
    await prisma.report.update({
      where: { id: parseInt(reportId) },
      data: {
        credibilityScore: score,
      },
    });
    return score;
  }
  static async getVoteStatistics(reportId) {
    const votes = await prisma.reportVote.findMany({
      where: {
        reportId: parseInt(reportId),
      },
    });
    const stats = {
      helpful: 0,
      not_helpful: 0,
      spam: 0,
      duplicate: 0,
      total: votes.length,
    };
    for (const vote of votes) {
      stats[vote.voteType]++;
    }
    const credibilityScore = await this.calculateCredibilityScore(reportId);
    return {
      ...stats,
      credibilityScore,
      averageScore: stats.total > 0 ? credibilityScore / stats.total : 0,
    };
  }
  static async getUserVotes(userId, filters = {}) {
    const { page = 1, limit = 10, voteType } = filters;
    const where = {
      userId: parseInt(userId),
    };
    if (voteType) where.voteType = voteType;
    const skip = (page - 1) * limit;
    const [votes, total] = await Promise.all([
      prisma.reportVote.findMany({
        where,
        include: {
          report: {
            select: {
              id: true,
              category: true,
              description: true,
              city: true,
              credibilityScore: true,
            },
          },
          user: {
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
      prisma.reportVote.count({ where }),
    ]);
    return {
      data: votes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  static async getMostHelpfulReports(filters = {}) {
    const { city, category, limit = 10, status = "active" } = filters;
    const where = {
      status: status,
      isDuplicate: false,
    };
    if (city) where.city = city;
    if (category) where.category = category;
    const reports = await prisma.report.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        votes: {
          select: {
            voteType: true,
          },
        },
      },
      orderBy: {
        credibilityScore: "desc",
      },
      take: limit,
    });
    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        const voteStats = await this.getVoteStatistics(report.id);
        return {
          ...report,
          voteStatistics: voteStats,
        };
      })
    );
    return enrichedReports;
  }
  static async getMostControversialReports(filters = {}) {
    const { city, category, limit = 10 } = filters;
    const where = {
      status: "active",
      isDuplicate: false,
    };
    if (city) where.city = city;
    if (category) where.category = category;
    const reports = await prisma.report.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        votes: {
          select: {
            voteType: true,
          },
        },
      },
    });
    const withControversyScore = await Promise.all(
      reports.map(async (report) => {
        const votes = report.votes || [];
        const positiveVotes = votes.filter((v) => VOTE_WEIGHTS[v.voteType] > 0).length;
        const negativeVotes = votes.filter((v) => VOTE_WEIGHTS[v.voteType] < 0).length;
        const controversyScore = Math.min(positiveVotes, negativeVotes) * 2;
        return {
          ...report,
          controversyScore,
          positiveVotes,
          negativeVotes,
        };
      })
    );
    return withControversyScore
      .sort((a, b) => b.controversyScore - a.controversyScore)
      .slice(0, limit);
  }
  static async getTrendingReports(filters = {}) {
    const { city, category, hours = 24, limit = 10 } = filters;
    const timeThreshold = new Date(Date.now() - hours * 3600000);
    const where = {
      status: "active",
      isDuplicate: false,
      createdAt: {
        gte: timeThreshold,
      },
    };
    if (city) where.city = city;
    if (category) where.category = category;
    const reports = await prisma.report.findMany({
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
    });
    const withTrendScore = reports.map((report) => {
      const ageInHours = (Date.now() - report.createdAt) / 3600000;
      const decayFactor = Math.exp(-ageInHours / 24); // Decay over 24 hours
      const trendScore = report.credibilityScore * decayFactor + report.votes.length;
      return {
        ...report,
        trendScore,
      };
    });
    return withTrendScore
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit);
  }
}
module.exports = CredibilityService;

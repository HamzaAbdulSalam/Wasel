const prisma = require("../utils/prisma");

// Constants for duplicate detection
const LOCATION_THRESHOLD_KM = 0.5; // Same location if within 500 meters
const TIME_THRESHOLD_MINUTES = 30; // Same event if within 30 minutes
const TEXT_SIMILARITY_THRESHOLD = 0.7; // 70% similar text

class DuplicateDetectionService {
  // Calculate Levenshtein distance (string similarity)
  // Returns a score between 0 and 1 (1 = identical, 0 = completely different)
  static calculateTextSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Levenshtein distance algorithm
  static levenshteinDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  // Calculate distance between two coordinates (Haversine formula)
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

  // Find potential duplicates for a report
  static async findPotentialDuplicates(newReport) {
    const timeThreshold = new Date(Date.now() - TIME_THRESHOLD_MINUTES * 60000);

    // Get reports from the same city/area within time threshold
    const potentialDuplicates = await prisma.report.findMany({
      where: {
        id: {
          not: newReport.id,
        },
        city: newReport.city,
        category: newReport.category,
        status: {
          not: "rejected",
        },
        createdAt: {
          gte: timeThreshold,
        },
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

    // Score similarity for each potential duplicate
    const scoredDuplicates = potentialDuplicates
      .map((report) => {
        const locationDistance = this.calculateDistance(
          parseFloat(newReport.latitude),
          parseFloat(newReport.longitude),
          parseFloat(report.latitude),
          parseFloat(report.longitude)
        );

        const textSimilarity = this.calculateTextSimilarity(
          newReport.description,
          report.description
        );

        // Calculate overall similarity score
        const locationScore =
          locationDistance <= LOCATION_THRESHOLD_KM
            ? 1 - locationDistance / LOCATION_THRESHOLD_KM
            : 0;
        const overallScore = locationScore * 0.6 + textSimilarity * 0.4;

        return {
          ...report,
          similarity: {
            overall: overallScore,
            location: locationScore,
            text: textSimilarity,
            distance: locationDistance,
          },
        };
      })
      .filter((report) => report.similarity.overall >= TEXT_SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity.overall - a.similarity.overall);

    return scoredDuplicates;
  }

  // Get duplicate report details
  static async getDuplicateDetails(reportId) {
    const report = await prisma.report.findUnique({
      where: { id: parseInt(reportId) },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!report) {
      throw new Error("Report not found");
    }

    const duplicates = await this.findPotentialDuplicates(report);

    return {
      report,
      potentialDuplicates: duplicates,
    };
  }

  // Merge duplicate reports (mark as duplicate)
  static async mergeDuplicates(reportIdToMerge, mainReportId) {
    const report = await prisma.report.update({
      where: { id: parseInt(reportIdToMerge) },
      data: {
        isDuplicate: true,
        duplicateOf: parseInt(mainReportId),
        status: "resolved",
      },
    });

    return report;
  }

  // Get all reported duplicates (grouped)
  static async getDuplicateGroups(city = null) {
    const where = city ? { city } : {};

    // Get all duplicate reports
    const duplicates = await prisma.report.findMany({
      where: {
        ...where,
        isDuplicate: true,
        duplicateOf: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        duplicateOf: "asc",
      },
    });

    // Group by main report
    const groups = {};
    for (const duplicate of duplicates) {
      if (!groups[duplicate.duplicateOf]) {
        groups[duplicate.duplicateOf] = [];
      }
      groups[duplicate.duplicateOf].push(duplicate);
    }

    // Enrich with main report data
    const enrichedGroups = [];
    for (const [mainReportId, reportList] of Object.entries(groups)) {
      const mainReport = await prisma.report.findUnique({
        where: { id: parseInt(mainReportId) },
      });

      if (mainReport) {
        enrichedGroups.push({
          mainReport,
          duplicateCount: reportList.length,
          duplicates: reportList,
        });
      }
    }

    return enrichedGroups;
  }
}

module.exports = DuplicateDetectionService;

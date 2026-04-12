const Joi = require("joi");
const prisma = require("../utils/prisma");

class RouteService {
  /**
   * Haversine formula to calculate distance between two coordinates (in km)
   * Using heuristic approach for estimation
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Estimate duration based on distance and road conditions
   * Uses heuristic speed calculations
   */
  estimateDuration(distance, roadType = "standard", congestion = "normal") {
    // Base speeds in km/h based on road type
    const speedMap = {
      highway: 100,
      major_road: 60,
      standard: 40,
      urban: 30,
      residential: 20,
    };

    // Congestion multipliers
    const congestionMap = {
      light: 1.0,
      normal: 1.2,
      moderate: 1.5,
      heavy: 2.0,
      severe: 2.5,
    };

    const baseSpeed = speedMap[roadType] || speedMap.standard;
    const congestionMultiplier =
      congestionMap[congestion] || congestionMap.normal;
    const effectiveSpeed = baseSpeed / congestionMultiplier;
    const durationHours = distance / effectiveSpeed;
    const durationMinutes = Math.round(durationHours * 60);

    return {
      minutes: durationMinutes,
      hours: Math.round((durationMinutes / 60) * 10) / 10, // 1 decimal place
    };
  }

  /**
   * Check if a point is within a radius of another point
   */
  isPointWithinRadius(lat, lon, centerLat, centerLon, radiusKm) {
    const distance = this.calculateDistance(lat, lon, centerLat, centerLon);
    return distance <= radiusKm;
  }

  /**
   * Check if route passes through checkpoints
   * Returns checkpoints that are near the route
   */
  async checkpointsOnRoute(startLat, startLon, endLat, endLon, radiusKm = 2) {
    try {
      // Get all active incidents which may include checkpoint locations
      const incidents = await prisma.roadIncident.findMany({
        where: {
          status: "active",
        },
        select: {
          id: true,
          title: true,
          type: true,
          latitude: true,
          longitude: true,
          city: true,
        },
      });

      // Filter incidents that are near the route
      const checkpointsOnRoute = incidents.filter((incident) => {
        const lat = parseFloat(incident.latitude);
        const lon = parseFloat(incident.longitude);
        // Check if incident is within radius of route
        return (
          this.isPointWithinRadius(lat, lon, startLat, startLon, radiusKm) ||
          this.isPointWithinRadius(lat, lon, endLat, endLon, radiusKm)
        );
      });

      return checkpointsOnRoute;
    } catch (error) {
      console.error("Error checking checkpoints on route:", error);
      return [];
    }
  }

  /**
   * Check if area is affected by incidents
   * Returns incidents in the surrounding area
   */
  async getAreaHazards(centerLat, centerLon, radiusKm = 5) {
    try {
      const hazards = await prisma.roadIncident.findMany({
        where: {
          status: "active",
        },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          severity: true,
          latitude: true,
          longitude: true,
          city: true,
          createdAt: true,
        },
      });

      const areaHazards = hazards.filter((hazard) => {
        const lat = parseFloat(hazard.latitude);
        const lon = parseFloat(hazard.longitude);
        return this.isPointWithinRadius(
          lat,
          lon,
          centerLat,
          centerLon,
          radiusKm,
        );
      });

      return areaHazards;
    } catch (error) {
      console.error("Error getting area hazards:", error);
      return [];
    }
  }

  /**
   * Estimate route between two locations
   * @param {number} startLat - Starting latitude
   * @param {number} startLon - Starting longitude
   * @param {number} endLat - Ending latitude
   * @param {number} endLon - Ending longitude
   * @param {object} options - Optional parameters
   */
  async estimateRoute(startLat, startLon, endLat, endLon, options = {}) {
    const {
      roadType = "standard",
      congestion = "normal",
      includeHazards = true,
    } = options;

    // Validate input
    const schema = Joi.object({
      startLat: Joi.number().min(-90).max(90).required(),
      startLon: Joi.number().min(-180).max(180).required(),
      endLat: Joi.number().min(-90).max(90).required(),
      endLon: Joi.number().min(-180).max(180).required(),
    });

    const { error } = schema.validate({
      startLat,
      startLon,
      endLat,
      endLon,
    });

    if (error) {
      throw new Error(`Invalid coordinates: ${error.details[0].message}`);
    }

    // Calculate distance
    const distance = this.calculateDistance(startLat, startLon, endLat, endLon);

    // Estimate duration
    const duration = this.estimateDuration(distance, roadType, congestion);

    // Get hazards on route if requested
    let hazards = [];
    if (includeHazards) {
      hazards = await this.getAreaHazards(startLat, startLon, 5);
      const endHazards = await this.getAreaHazards(endLat, endLon, 5);
      hazards = [
        ...new Map([...hazards, ...endHazards].map((h) => [h.id, h])).values(),
      ];
    }

    // Prepare metadata about factors affecting the route
    const metadata = {
      roadType,
      congestionLevel: congestion,
      hazardCount: hazards.length,
      factors: [
        `Estimated on ${roadType} roads`,
        `Congestion level: ${congestion}`,
        hazards.length > 0
          ? `${hazards.length} potential hazards on route`
          : "No hazards detected",
      ],
    };

    return {
      startLocation: {
        latitude: startLat,
        longitude: startLon,
      },
      endLocation: {
        latitude: endLat,
        longitude: endLon,
      },
      distance: {
        km: Math.round(distance * 100) / 100,
        miles: Math.round(distance * 0.621371 * 100) / 100,
      },
      duration,
      hazards,
      metadata,
      estimatedAt: new Date(),
    };
  }

  /**
   * Estimate route with constraints (avoiding checkpoints or areas)
   * @param {number} startLat - Starting latitude
   * @param {number} startLon - Starting longitude
   * @param {number} endLat - Ending latitude
   * @param {number} endLon - Ending longitude
   * @param {object} constraints - Constraints object
   */
  async estimateRouteWithConstraints(
    startLat,
    startLon,
    endLat,
    endLon,
    constraints = {},
  ) {
    const {
      avoidCheckpoints = false,
      avoidAreas = [],
      roadType = "standard",
      congestion = "normal",
    } = constraints;

    // Get base route estimation
    const baseRoute = await this.estimateRoute(
      startLat,
      startLon,
      endLat,
      endLon,
      {
        roadType,
        congestion,
        includeHazards: true,
      },
    );

    // Check for checkpoints if requested
    let checkpointWarnings = [];
    if (avoidCheckpoints) {
      const checkpointsNearby = await this.checkpointsOnRoute(
        startLat,
        startLon,
        endLat,
        endLon,
        2, // 2 km radius
      );
      checkpointWarnings = checkpointsNearby.map((cp) => ({
        id: cp.id,
        title: cp.title,
        type: cp.type,
        latitude: cp.latitude,
        longitude: cp.longitude,
        message: `Route may pass through checkpoint: ${cp.title}`,
      }));

      if (checkpointWarnings.length > 0) {
        // Estimate impact of avoiding checkpoints (add 20% to duration and distance)
        baseRoute.distanceWithConstraints = {
          km: Math.round(baseRoute.distance.km * 1.2 * 100) / 100,
          miles: Math.round(baseRoute.distance.miles * 1.2 * 100) / 100,
        };
        baseRoute.durationWithConstraints = {
          minutes: Math.round(baseRoute.duration.minutes * 1.2),
          hours:
            Math.round(((baseRoute.duration.minutes * 1.2) / 60) * 10) / 10,
        };
      }
    }

    // Check for restricted areas
    let restrictedAreaWarnings = [];
    if (avoidAreas.length > 0) {
      restrictedAreaWarnings = avoidAreas.map((area) => ({
        area: area.name,
        impact: `Route avoids ${area.name}`,
      }));

      if (
        restrictedAreaWarnings.length > 0 &&
        !baseRoute.distanceWithConstraints
      ) {
        // Estimate impact of avoiding areas (add 15% for each area)
        const areaImpact = restrictedAreaWarnings.length * 0.15;
        baseRoute.distanceWithConstraints = {
          km: Math.round(baseRoute.distance.km * (1 + areaImpact) * 100) / 100,
          miles:
            Math.round(baseRoute.distance.miles * (1 + areaImpact) * 100) / 100,
        };
        baseRoute.durationWithConstraints = {
          minutes: Math.round(baseRoute.duration.minutes * (1 + areaImpact)),
          hours:
            Math.round(
              ((baseRoute.duration.minutes * (1 + areaImpact)) / 60) * 10,
            ) / 10,
        };
      }
    }

    // Update metadata with constraint information
    baseRoute.metadata.constraints = {
      avoidingCheckpoints: avoidCheckpoints,
      avoidingAreas: avoidAreas.map((a) => a.name),
      checkpointWarnings: checkpointWarnings.length,
      restrictedAreaWarnings: restrictedAreaWarnings.length,
    };

    baseRoute.metadata.factors.push(
      ...checkpointWarnings.map((w) => w.message),
      ...restrictedAreaWarnings.map((w) => w.impact),
    );

    return {
      ...baseRoute,
      checkpointWarnings,
      restrictedAreaWarnings,
      constraintImpact: {
        appliedConstraints: {
          avoidCheckpoints,
          avoidAreas: avoidAreas.map((a) => a.name),
        },
        additionalDistance: baseRoute.distanceWithConstraints
          ? baseRoute.distanceWithConstraints.km - baseRoute.distance.km
          : 0,
        additionalDuration: baseRoute.durationWithConstraints
          ? baseRoute.durationWithConstraints.minutes -
            baseRoute.duration.minutes
          : 0,
      },
    };
  }

  /**
   * Get validation schema for route estimation request
   */
  getEstimateRouteSchema() {
    return Joi.object({
      startLatitude: Joi.number().min(-90).max(90).required(),
      startLongitude: Joi.number().min(-180).max(180).required(),
      endLatitude: Joi.number().min(-90).max(90).required(),
      endLongitude: Joi.number().min(-180).max(180).required(),
      roadType: Joi.string()
        .valid("highway", "major_road", "standard", "urban", "residential")
        .default("standard"),
      congestion: Joi.string()
        .valid("light", "normal", "moderate", "heavy", "severe")
        .default("normal"),
      includeHazards: Joi.boolean().default(true),
    });
  }

  /**
   * Get validation schema for constrained route estimation
   */
  getConstrainedRouteSchema() {
    return Joi.object({
      startLatitude: Joi.number().min(-90).max(90).required(),
      startLongitude: Joi.number().min(-180).max(180).required(),
      endLatitude: Joi.number().min(-90).max(90).required(),
      endLongitude: Joi.number().min(-180).max(180).required(),
      roadType: Joi.string()
        .valid("highway", "major_road", "standard", "urban", "residential")
        .default("standard"),
      congestion: Joi.string()
        .valid("light", "normal", "moderate", "heavy", "severe")
        .default("normal"),
      avoidCheckpoints: Joi.boolean().default(false),
      avoidAreas: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().required(),
            latitude: Joi.number().min(-90).max(90),
            longitude: Joi.number().min(-180).max(180),
          }),
        )
        .default([]),
    });
  }
}

module.exports = new RouteService();

const Joi = require("joi");
const prisma = require("../utils/prisma");
const GeolocationService = require("./GeolocationService");
const WeatherService = require("./WeatherService");

class RouteService {
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
  estimateDuration(distance, roadType = "standard", congestion = "normal") {
    const speedMap = {
      highway: 100,
      major_road: 60,
      standard: 40,
      urban: 30,
      residential: 20,
    };
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
  isPointWithinRadius(lat, lon, centerLat, centerLon, radiusKm) {
    const distance = this.calculateDistance(lat, lon, centerLat, centerLon);
    return distance <= radiusKm;
  }
  async checkpointsOnRoute(startLat, startLon, endLat, endLon, radiusKm = 2) {
    try {
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
      const checkpointsOnRoute = incidents.filter((incident) => {
        const lat = parseFloat(incident.latitude);
        const lon = parseFloat(incident.longitude);
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
  async estimateRoute(startLat, startLon, endLat, endLon, options = {}) {
    const {
      roadType = "standard",
      congestion = "normal",
      includeHazards = true,
    } = options;
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
    const distance = this.calculateDistance(startLat, startLon, endLat, endLon);
    const duration = this.estimateDuration(distance, roadType, congestion);
    let hazards = [];
    if (includeHazards) {
      hazards = await this.getAreaHazards(startLat, startLon, 5);
      const endHazards = await this.getAreaHazards(endLat, endLon, 5);
      hazards = [
        ...new Map([...hazards, ...endHazards].map((h) => [h.id, h])).values(),
      ];
    }
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
   * Get address details for coordinates using external geocoding API
   */
  async getLocationDetails(latitude, longitude) {
    try {
      return await GeolocationService.getAddressFromCoordinates(latitude, longitude);
    } catch (error) {
      console.warn(`Geocoding failed, returning basic coordinates: ${error.message}`);
      return {
        latitude,
        longitude,
        address: 'Unknown',
        city: 'Unknown',
        country: 'UAE',
        error: true,
      };
    }
  }

  /**
   * Search for locations by address using external API
   */
  async searchLocation(address) {
    try {
      return await GeolocationService.getCoordinatesFromAddress(address);
    } catch (error) {
      console.error(`Location search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get weather information for a route
   */
  async getRouteWeather(startLat, startLon, endLat, endLon) {
    try {
      // Get weather at start and end points
      const [startWeather, endWeather] = await Promise.all([
        WeatherService.getCurrentWeather(startLat, startLon),
        WeatherService.getCurrentWeather(endLat, endLon),
      ]);

      const [startRisk, endRisk] = await Promise.all([
        WeatherService.assessWeatherRisk(startLat, startLon),
        WeatherService.assessWeatherRisk(endLat, endLon),
      ]);

      return {
        startPoint: {
          weather: startWeather,
          riskAssessment: startRisk,
        },
        endPoint: {
          weather: endWeather,
          riskAssessment: endRisk,
        },
        maxRiskLevel: this.getMaxRiskLevel(startRisk.riskLevel, endRisk.riskLevel),
        routeWeatherFactors: this.analyzeRouteWeather(startRisk, endRisk),
      };
    } catch (error) {
      console.warn(`Weather fetch failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Analyze weather factors affecting the route
   */
  analyzeRouteWeather(startRisk, endRisk) {
    const factors = [];
    
    // Combine risks from both points
    const allRisks = {
      wind: startRisk.risks.wind || endRisk.risks.wind,
      rain: startRisk.risks.rain || endRisk.risks.rain,
      snow: startRisk.risks.snow || endRisk.risks.snow,
      fog: startRisk.risks.fog || endRisk.risks.fog,
      thunder: startRisk.risks.thunder || endRisk.risks.thunder,
      extreme: startRisk.risks.extreme || endRisk.risks.extreme,
    };

    if (allRisks.rain) factors.push('Heavy rain expected - increase following distance');
    if (allRisks.wind) factors.push('Strong winds - maintain firm vehicle control');
    if (allRisks.snow) factors.push('Snow conditions - use appropriate tires');
    if (allRisks.fog) factors.push('Reduced visibility - use headlights');
    if (allRisks.thunder) factors.push('Thunderstorm risk - avoid open areas');
    if (allRisks.extreme) factors.push('Extreme weather - consider postponing travel');

    return factors;
  }

  /**
   * Get maximum risk level between two risk levels
   */
  getMaxRiskLevel(level1, level2) {
    const levels = { safe: 0, moderate: 1, high: 2, critical: 3 };
    return levels[level1] >= levels[level2] ? level1 : level2;
  }

  /**
   * Estimate route with external API data (location details & weather)
   */
  async estimateRouteEnhanced(startLat, startLon, endLat, endLon, options = {}) {
    // Get base route estimation
    const baseRoute = await this.estimateRoute(startLat, startLon, endLat, endLon, options);

    try {
      // Enrich with location details
      const startDetails = await this.getLocationDetails(startLat, startLon);
      const endDetails = await this.getLocationDetails(endLat, endLon);

      baseRoute.startLocation = {
        ...baseRoute.startLocation,
        ...startDetails,
      };

      baseRoute.endLocation = {
        ...baseRoute.endLocation,
        ...endDetails,
      };

      // Add weather information
      const weather = await this.getRouteWeather(startLat, startLon, endLat, endLon);
      if (weather) {
        baseRoute.weatherData = weather;
        baseRoute.metadata.factors.push(...(weather.routeWeatherFactors || []));
      }

      baseRoute.enhancedWithExternalAPIs = true;
    } catch (error) {
      console.warn(`Route enhancement failed: ${error.message}. Returning basic estimate.`);
      baseRoute.enhancedWithExternalAPIs = false;
    }

    return baseRoute;
  }

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

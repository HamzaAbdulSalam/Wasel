const express = require("express");
const RouteService = require("../services/RouteService");
const GeolocationService = require("../services/GeolocationService");
const WeatherService = require("../services/WeatherService");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.post("/estimate", async (req, res) => {
  try {
    const schema = RouteService.getEstimateRouteSchema();
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        details: error.details[0].message,
      });
    }
    const {
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
      roadType,
      congestion,
      includeHazards,
    } = value;
    const routeEstimate = await RouteService.estimateRoute(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
      {
        roadType,
        congestion,
        includeHazards,
      },
    );
    res.status(200).json({
      success: true,
      message: "Route estimated successfully",
      data: routeEstimate,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});
router.post("/estimate-with-constraints", async (req, res) => {
  try {
    const schema = RouteService.getConstrainedRouteSchema();
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        details: error.details[0].message,
      });
    }
    const {
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
      roadType,
      congestion,
      avoidCheckpoints,
      avoidAreas,
    } = value;
    const routeEstimate = await RouteService.estimateRouteWithConstraints(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
      {
        avoidCheckpoints,
        avoidAreas,
        roadType,
        congestion,
      },
    );
    res.status(200).json({
      success: true,
      message: "Route with constraints estimated successfully",
      data: routeEstimate,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});
router.get("/hazards", async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
    }
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude",
      });
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude",
      });
    }
    if (isNaN(radiusKm) || radiusKm <= 0) {
      return res.status(400).json({
        success: false,
        message: "Radius must be a positive number",
      });
    }
    const hazards = await RouteService.getAreaHazards(lat, lon, radiusKm);
    res.status(200).json({
      success: true,
      message: "Area hazards retrieved successfully",
      data: {
        hazards,
        count: hazards.length,
        center: {
          latitude: lat,
          longitude: lon,
        },
        radius: radiusKm,
        unit: "km",
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});
router.post("/calculate-distance", async (req, res) => {
  try {
    const { startLatitude, startLongitude, endLatitude, endLongitude } =
      req.body;
    const errors = [];
    if (
      !startLatitude ||
      isNaN(startLatitude) ||
      startLatitude < -90 ||
      startLatitude > 90
    ) {
      errors.push("startLatitude is required and must be between -90 and 90");
    }
    if (
      !startLongitude ||
      isNaN(startLongitude) ||
      startLongitude < -180 ||
      startLongitude > 180
    ) {
      errors.push(
        "startLongitude is required and must be between -180 and 180",
      );
    }
    if (
      !endLatitude ||
      isNaN(endLatitude) ||
      endLatitude < -90 ||
      endLatitude > 90
    ) {
      errors.push("endLatitude is required and must be between -90 and 90");
    }
    if (
      !endLongitude ||
      isNaN(endLongitude) ||
      endLongitude < -180 ||
      endLongitude > 180
    ) {
      errors.push("endLongitude is required and must be between -180 and 180");
    }
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        details: errors,
      });
    }
    const distance = RouteService.calculateDistance(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
    res.status(200).json({
      success: true,
      data: {
        distance: {
          km: Math.round(distance * 100) / 100,
          miles: Math.round(distance * 0.621371 * 100) / 100,
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * EXTERNAL API INTEGRATION ENDPOINTS
 */

// Enhanced route estimation with location details and weather
router.post("/estimate-enhanced", async (req, res) => {
  try {
    const schema = RouteService.getEstimateRouteSchema();
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        details: error.details[0].message,
      });
    }

    const {
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
      roadType,
      congestion,
      includeHazards,
    } = value;

    const routeEstimate = await RouteService.estimateRouteEnhanced(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
      {
        roadType,
        congestion,
        includeHazards,
      },
    );

    res.status(200).json({
      success: true,
      message: "Enhanced route estimated successfully (with location details and weather)",
      data: routeEstimate,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Location search by address
router.get("/geolocation/search", async (req, res) => {
  try {
    const { address } = req.query;
    if (!address || address.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Address query must be at least 2 characters",
      });
    }

    const results = await RouteService.searchLocation(address);

    res.status(200).json({
      success: true,
      message: "Location search completed",
      data: {
        query: address,
        results: results,
        count: results.length,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get location details from coordinates
router.get("/geolocation/reverse", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude (-90 to 90)",
      });
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude (-180 to 180)",
      });
    }

    const locationDetails = await GeolocationService.getAddressFromCoordinates(lat, lon);

    res.status(200).json({
      success: true,
      message: "Location details retrieved",
      data: locationDetails,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get current weather at coordinates
router.get("/weather/current", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude",
      });
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude",
      });
    }

    const weather = await WeatherService.getCurrentWeather(lat, lon);

    res.status(200).json({
      success: true,
      message: "Current weather retrieved successfully",
      data: weather,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get weather forecast at coordinates
router.get("/weather/forecast", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude",
      });
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude",
      });
    }

    const forecast = await WeatherService.getWeatherForecast(lat, lon);

    res.status(200).json({
      success: true,
      message: "Weather forecast retrieved successfully",
      data: forecast,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get weather risk assessment
router.get("/weather/risk-assessment", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude",
      });
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude",
      });
    }

    const riskAssessment = await WeatherService.assessWeatherRisk(lat, lon);

    res.status(200).json({
      success: true,
      message: "Weather risk assessment completed",
      data: riskAssessment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get weather by city name
router.get("/weather/city/:cityName", async (req, res) => {
  try {
    const { cityName } = req.params;

    if (!cityName || cityName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "City name must be at least 2 characters",
      });
    }

    const weather = await WeatherService.getWeatherByCity(cityName);

    res.status(200).json({
      success: true,
      message: "Weather for city retrieved successfully",
      data: weather,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get cache statistics (admin only)
router.get("/api/cache-stats", authenticate, async (req, res) => {
  try {
    const geoStats = GeolocationService.getCacheStats();
    const weatherStats = WeatherService.getCacheStats();

    res.status(200).json({
      success: true,
      message: "API cache statistics",
      data: {
        geolocation: {
          cacheHits: geoStats.hits,
          cacheMisses: geoStats.misses,
          keys: geoStats.keys,
          size: Object.keys(geoStats).reduce((sum, key) => sum + (geoStats[key] || 0), 0),
        },
        weather: {
          cacheHits: weatherStats.hits,
          cacheMisses: weatherStats.misses,
          keys: weatherStats.keys,
          size: Object.keys(weatherStats).reduce((sum, key) => sum + (weatherStats[key] || 0), 0),
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

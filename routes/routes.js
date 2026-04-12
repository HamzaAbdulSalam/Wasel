const express = require("express");
const RouteService = require("../services/RouteService");
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

    // Validate
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

    // Validate
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

module.exports = router;

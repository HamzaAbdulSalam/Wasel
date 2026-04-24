const ApiClient = require('../utils/apiClient');
const Joi = require('joi');

/**
 * GeolocationService - OpenStreetMap/Nominatim Integration
 * - Reverse geocoding (coordinates to address)
 * - Forward geocoding (address to coordinates)
 * - Location validation
 */
class GeolocationService {
  constructor() {
    // Nominatim API (OpenStreetMap's geocoding service)
    // NOTE: Nominatim REQUIRES a User-Agent header - it will reject requests without one (403 Forbidden)
    this.client = new ApiClient({
      baseURL: 'https://nominatim.openstreetmap.org',
      timeout: 8000,
      retries: 2,
      cacheTTL: 3600, // Cache for 1 hour
      rateLimit: {
        maxRequests: 1, // Nominatim: 1 req per second
        windowMs: 1000,
      },
    });
  }

  /**
   * Reverse geocoding - Get address from coordinates
   * @param {number} latitude
   * @param {number} longitude
   * @returns {object} Address details
   */
  async getAddressFromCoordinates(latitude, longitude) {
    try {
      const schema = Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
      });

      const { error, value } = schema.validate({ latitude, longitude });
      if (error) throw new Error(error.details[0].message);

      const response = await this.client.get('/reverse', {
        params: {
          lat: value.latitude,
          lon: value.longitude,
          format: 'json',
          zoom: 18,
          addressdetails: 1,
        },
        useCache: true,
        cacheTTL: 7200, // 2 hours for addresses
      });

      if (!response.data || !response.data.address) {
        throw new Error('No address found for the given coordinates');
      }

      return {
        latitude: response.data.lat,
        longitude: response.data.lon,
        address: response.data.address.road || response.data.address.hamlet || 'Unknown',
        city: response.data.address.city || response.data.address.town || response.data.address.village,
        state: response.data.address.state,
        country: response.data.address.country,
        postalCode: response.data.address.postcode,
        displayName: response.data.display_name,
        placeType: response.data.type,
        cached: response.cached,
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  /**
   * Forward geocoding - Get coordinates from address
   * @param {string} address
   * @returns {object} Coordinates and place details
   */
  async getCoordinatesFromAddress(address) {
    try {
      const schema = Joi.object({
        address: Joi.string().min(3).max(500).required(),
      });

      const { error, value } = schema.validate({ address });
      if (error) throw new Error(error.details[0].message);

      const response = await this.client.get('/search', {
        params: {
          q: value.address,
          format: 'json',
          limit: 5,
          addressdetails: 1,
        },
        useCache: true,
        cacheTTL: 7200,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No locations found matching the address');
      }

      return response.data.map(place => ({
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
        address: place.address?.road || place.name,
        city: place.address?.city || place.address?.town,
        country: place.address?.country,
        displayName: place.display_name,
        placeType: place.type,
        importance: place.importance,
        cached: response.cached,
      }));
    } catch (error) {
      console.error('Forward geocoding error:', error.message);
      throw new Error(`Forward geocoding failed: ${error.message}`);
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {number} Distance in kilometers
   */
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

  /**
   * Validate if coordinates are within UAE
   * @param {number} latitude
   * @param {number} longitude
   * @returns {boolean}
   */
  static isWithinUAE(latitude, longitude) {
    // UAE approximate bounds
    const minLat = 22.5;
    const maxLat = 26.5;
    const minLon = 51.5;
    const maxLon = 56.5;

    return (
      latitude >= minLat &&
      latitude <= maxLat &&
      longitude >= minLon &&
      longitude <= maxLon
    );
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.client.getCacheStats();
  }

  /**
   * Clear geocoding cache
   */
  clearCache() {
    this.client.clearCache();
  }
}

module.exports = new GeolocationService();

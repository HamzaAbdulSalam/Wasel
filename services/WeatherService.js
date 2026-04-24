const ApiClient = require('../utils/apiClient');
const Joi = require('joi');

/**
 * WeatherService - OpenWeatherMap Integration
 * - Current weather data
 * - Weather forecasts
 * - Weather-based alerts
 */
class WeatherService {
  constructor() {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      console.warn('[WARNING] OPENWEATHER_API_KEY not configured. Weather features will be limited.');
    }

    this.client = new ApiClient({
      baseURL: 'https://api.openweathermap.org/data/2.5',
      timeout: 8000,
      retries: 2,
      cacheTTL: 600, 
      rateLimit: {
        maxRequests: 60, 
        windowMs: 60000,
      },
      authToken: apiKey,
      authType: '', 
    });

    this.apiKey = apiKey;
  }

  /**
   * Get current weather at coordinates
   * @param {number} latitude
   * @param {number} longitude
   * @returns {object} Current weather data
   */
  async getCurrentWeather(latitude, longitude) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenWeatherMap API key not configured');
      }

      const schema = Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
      });

      const { error, value } = schema.validate({ latitude, longitude });
      if (error) throw new Error(error.details[0].message);

      const response = await this.client.get('/weather', {
        params: {
          lat: value.latitude,
          lon: value.longitude,
          appid: this.apiKey,
          units: 'metric', // Celsius
        },
        useCache: true,
        cacheTTL: 600,
      });

      return this.formatWeatherData(response.data, response.cached);
    } catch (error) {
      console.error('Current weather fetch error:', error.message);
      throw new Error(`Failed to fetch current weather: ${error.message}`);
    }
  }

  /**
   * Get weather forecast (5 days, 3-hour intervals)
   * @param {number} latitude
   * @param {number} longitude
   * @returns {object} Forecast data
   */
  async getWeatherForecast(latitude, longitude) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenWeatherMap API key not configured');
      }

      const schema = Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
      });

      const { error, value } = schema.validate({ latitude, longitude });
      if (error) throw new Error(error.details[0].message);

      const response = await this.client.get('/forecast', {
        params: {
          lat: value.latitude,
          lon: value.longitude,
          appid: this.apiKey,
          units: 'metric',
        },
        useCache: true,
        cacheTTL: 900, 
      });

      if (!response.data.list) {
        throw new Error('Invalid forecast response');
      }

      const forecastByDay = {};
      response.data.list.forEach(entry => {
        const date = new Date(entry.dt * 1000).toISOString().split('T')[0];
        if (!forecastByDay[date]) {
          forecastByDay[date] = [];
        }
        forecastByDay[date].push(this.formatSingleForecast(entry));
      });

      return {
        city: response.data.city.name,
        country: response.data.city.country,
        timezone: response.data.city.timezone,
        forecast: forecastByDay,
        cached: response.cached,
        fetchedAt: new Date(),
      };
    } catch (error) {
      console.error('Weather forecast fetch error:', error.message);
      throw new Error(`Failed to fetch weather forecast: ${error.message}`);
    }
  }

  /**
   * Get weather by city name
   * @param {string} cityName
   * @returns {object} Current weather data
   */
  async getWeatherByCity(cityName) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenWeatherMap API key not configured');
      }

      const schema = Joi.object({
        cityName: Joi.string().min(2).max(100).required(),
      });

      const { error, value } = schema.validate({ cityName });
      if (error) throw new Error(error.details[0].message);

      const response = await this.client.get('/weather', {
        params: {
          q: value.cityName,
          appid: this.apiKey,
          units: 'metric',
        },
        useCache: true,
        cacheTTL: 600,
      });

      return this.formatWeatherData(response.data, response.cached);
    } catch (error) {
      console.error('City weather fetch error:', error.message);
      throw new Error(`Failed to fetch weather for city: ${error.message}`);
    }
  }

  /**
   * Check if weather conditions might affect road incidents
   * @param {number} latitude
   * @param {number} longitude
   * @returns {object} Risk assessment
   */
  async assessWeatherRisk(latitude, longitude) {
    try {
      const weather = await this.getCurrentWeather(latitude, longitude);

      const risks = {
        wind: false,
        rain: false,
        snow: false,
        fog: false,
        thunder: false,
        extreme: false,
      };

      const conditions = weather.weather || [];
      const main = weather.main || {};

      conditions.forEach(condition => {
        const type = condition.main.toLowerCase();
        if (type.includes('rain') || type.includes('drizzle')) risks.rain = true;
        if (type.includes('snow')) risks.snow = true;
        if (type.includes('fog') || type.includes('mist')) risks.fog = true;
        if (type.includes('thunderstorm')) risks.thunder = true;
      });

      if (weather.wind?.speed > 40) risks.extreme = true;
      if (weather.wind?.speed > 20) risks.wind = true;

      const activeRisks = Object.values(risks).filter(r => r).length;
      let riskLevel = 'safe';
      if (activeRisks >= 3) riskLevel = 'critical';
      else if (activeRisks === 2) riskLevel = 'high';
      else if (activeRisks === 1) riskLevel = 'moderate';

      return {
        location: {
          latitude,
          longitude,
          city: weather.city || 'Unknown',
        },
        riskLevel,
        risks,
        conditions: conditions.map(c => c.description),
        temperature: main.temp,
        windSpeed: weather.wind?.speed,
        humidity: main.humidity,
        visibility: weather.visibility,
        recommendations: this.getWeatherRecommendations(risks, riskLevel),
        assessedAt: new Date(),
        cached: weather.cached,
      };
    } catch (error) {
      console.error('Weather risk assessment error:', error.message);
      throw new Error(`Failed to assess weather risk: ${error.message}`);
    }
  }

  /**
   * Format weather data
   */
  formatWeatherData(data, cached = false) {
    const main = data.main || {};
    const wind = data.wind || {};
    const conditions = data.weather || [];
    const clouds = data.clouds || {};

    return {
      city: data.name,
      country: data.sys?.country,
      coordinates: {
        latitude: data.coord?.lat,
        longitude: data.coord?.lon,
      },
      weather: conditions.map(c => ({
        main: c.main,
        description: c.description,
        icon: c.icon,
      })),
      main: {
        temperature: main.temp,
        feelsLike: main.feels_like,
        tempMin: main.temp_min,
        tempMax: main.temp_max,
        pressure: main.pressure,
        humidity: main.humidity,
      },
      wind: {
        speed: wind.speed,
        direction: wind.deg,
        gust: wind.gust,
      },
      clouds: clouds.all,
      visibility: data.visibility,
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      timestamp: new Date(data.dt * 1000),
      sunrise: new Date(data.sys?.sunrise * 1000),
      sunset: new Date(data.sys?.sunset * 1000),
      cached,
    };
  }

  /**
   * Format single forecast entry
   */
  formatSingleForecast(entry) {
    return {
      timestamp: new Date(entry.dt * 1000),
      temperature: entry.main.temp,
      feelsLike: entry.main.feels_like,
      description: entry.weather[0]?.description,
      windSpeed: entry.wind.speed,
      precipitation: entry.pop * 100, // Probability of precipitation
      humidity: entry.main.humidity,
    };
  }

  /**
   * Get recommendations based on weather risks
   */
  getWeatherRecommendations(risks, riskLevel) {
    const recommendations = [];

    if (riskLevel === 'critical') {
      recommendations.push('⚠️ CRITICAL CONDITIONS: Exercise extreme caution. Consider avoiding travel if possible.');
    } else if (riskLevel === 'high') {
      recommendations.push('⚠️ Severe weather conditions detected. Reduce speed and increase following distance.');
    } else if (riskLevel === 'moderate') {
      recommendations.push('ℹ️ Adverse weather present. Drive with caution.');
    }

    if (risks.rain) recommendations.push('🌧️ Heavy rain expected. Reduce speed, watch for standing water.');
    if (risks.wind) recommendations.push('💨 Strong winds possible. Maintain firm control of vehicle.');
    if (risks.snow) recommendations.push('❄️ Snow present. Use snow tires or chains if required.');
    if (risks.fog) recommendations.push('🌫️ Fog visibility reduced. Use headlights and reduce speed.');
    if (risks.thunder) recommendations.push('⛈️ Thunderstorms active. Avoid areas prone to flooding.');

    return recommendations;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.client.getCacheStats();
  }

  /**
   * Clear weather cache
   */
  clearCache() {
    this.client.clearCache();
  }
}

module.exports = new WeatherService();

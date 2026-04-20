const axios = require('axios');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '..', 'api-client.log');

function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

/**
 * ApiClient - Utility for making HTTP requests with:
 * - Built-in caching
 * - Rate limiting
 * - Timeout handling
 * - Retry logic
 * - Authentication support
 */
class ApiClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '';
    this.timeout = options.timeout || 5000;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    this.cacheEnabled = options.cacheEnabled !== false;
    this.cacheTTL = options.cacheTTL || 300; // 5 minutes default
    this.cache = new NodeCache({ stdTTL: this.cacheTTL, checkperiod: 60 });
    
    this.rateLimit = options.rateLimit || {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
    };
    this.requestLog = [];
    
    this.authToken = options.authToken || null;
    this.authHeader = options.authHeader || 'Authorization';
    this.authType = options.authType || 'Bearer';
  }

  /**
   * Check if rate limit is exceeded
   */
  isRateLimited() {
    const now = Date.now();
    const windowStart = now - this.rateLimit.windowMs;
    
    this.requestLog = this.requestLog.filter(time => time > windowStart);
    
    if (this.requestLog.length >= this.rateLimit.maxRequests) {
      return true;
    }
    
    this.requestLog.push(now);
    return false;
  }

  /**
   * Get cache key for a request
   */
  getCacheKey(method, url, params) {
    return `${method}:${url}:${JSON.stringify(params || {})}`;
  }

  /**
   * Make an HTTP request with caching, rate limiting, and retry logic
   */
  async request(method, url, config = {}) {
    const {
      data = null,
      params = null,
      useCache = this.cacheEnabled,
      cacheTTL = this.cacheTTL,
      headers = {},
    } = config;

    const fullURL = this.baseURL ? `${this.baseURL}${url}` : url;
    const cacheKey = this.getCacheKey(method, fullURL, params);

    if (useCache && method.toUpperCase() === 'GET') {
      const cachedResponse = this.cache.get(cacheKey);
      if (cachedResponse) {
        logToFile(`[Cache HIT] ${method} ${fullURL}`);
        return { ...cachedResponse, cached: true };
      }
    }

    if (this.isRateLimited()) {
      throw new Error(`Rate limit exceeded. Max ${this.rateLimit.maxRequests} requests per ${this.rateLimit.windowMs}ms`);
    }

    const requestHeaders = {
      'User-Agent': 'Wasel-MobilityPlatform/1.0 (contact: admin@wasel.app)',
      ...headers,
    };

    if (data) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    if (this.authToken) {
      requestHeaders[this.authHeader] = `${this.authType} ${this.authToken}`;
    }

    const axiosConfig = {
      method: method.toUpperCase(),
      url: fullURL,
      timeout: this.timeout,
      headers: requestHeaders,
      validateStatus: () => true, // Don't throw on any status
    };

    if (params) axiosConfig.params = params;
    if (data) axiosConfig.data = data;

    let lastError;
    
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        logToFile(`[Request] ${method.toUpperCase()} ${fullURL} (attempt ${attempt + 1}/${this.retries})`);
        logToFile(`[Headers] ${JSON.stringify(requestHeaders)}`);
        logToFile(`[Params] ${JSON.stringify(params)}`);
        logToFile(`[Config] timeout=${this.timeout}, data=${data ? 'yes' : 'no'}`);
        
        const response = await axios(axiosConfig);

        if (response.status >= 400) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          error.status = response.status;
          error.response = { status: response.status, statusText: response.statusText, data: response.data };
          throw error;
        }

        if (useCache && method.toUpperCase() === 'GET') {
          const responseToCache = {
            data: response.data,
            status: response.status,
            headers: response.headers,
          };
          this.cache.set(cacheKey, responseToCache, cacheTTL);
        }

        return {
          data: response.data,
          status: response.status,
          headers: response.headers,
          cached: false,
        };
      } catch (error) {
        lastError = error;
        
        const statusCode = error.status || error.response?.status;
        logToFile(`[Error] ${method.toUpperCase()} ${fullURL} - Status: ${statusCode}`);
        logToFile(`[ErrorMessage] ${error.message}`);
        logToFile(`[ErrorFull] ${JSON.stringify(error, null, 2)}`);
        
        if (statusCode >= 400 && statusCode < 500) {
          logToFile(`[Decision] Throwing immediately - client error (${statusCode})`);
          throw error;
        }

        if (attempt < this.retries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          logToFile(`[Retry] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Request failed after ${this.retries} attempts: ${lastError.message}`);
  }

  /**
   * GET request
   */
  async get(url, config = {}) {
    return this.request('GET', url, config);
  }

  /**
   * POST request
   */
  async post(url, data, config = {}) {
    return this.request('POST', url, { ...config, data });
  }

  /**
   * PUT request
   */
  async put(url, data, config = {}) {
    return this.request('PUT', url, { ...config, data });
  }

  /**
   * DELETE request
   */
  async delete(url, config = {}) {
    return this.request('DELETE', url, config);
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.flushAll();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Update rate limit configuration
   */
  setRateLimit(maxRequests, windowMs) {
    this.rateLimit = { maxRequests, windowMs };
    this.requestLog = [];
  }
}

module.exports = ApiClient;

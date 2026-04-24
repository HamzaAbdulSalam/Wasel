const jwt = require("jsonwebtoken");
class JWTUtils {
  static getAccessSecret() {
    return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "secret";
  }

  static getRefreshSecret() {
    return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "secret";
  }

  static generateAccessToken(payload) {
    return jwt.sign(payload, this.getAccessSecret(), {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    });
  }

  static generateRefreshToken(payload) {
    return jwt.sign(payload, this.getRefreshSecret(), {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    });
  }

  static generateToken(payload) {
    return this.generateAccessToken(payload);
  }
  static verifyToken(token) {
    try {
      return jwt.verify(token, this.getAccessSecret());
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.getRefreshSecret());
    } catch (error) {
      throw new Error("Invalid token");
    }
  }
  static decodeToken(token) {
    return jwt.decode(token);
  }
}
module.exports = JWTUtils;

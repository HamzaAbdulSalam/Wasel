const jwt = require("jsonwebtoken");
class JWTUtils {
  static generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET || "secret", {
      expiresIn: "1h",
    });
  }
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || "secret");
    } catch (error) {
      throw new Error("Invalid token");
    }
  }
  static decodeToken(token) {
    return jwt.decode(token);
  }
}
module.exports = JWTUtils;

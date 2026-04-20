const bcrypt = require("bcryptjs");
class User {
  constructor(id, username, email, password, role = "user") {
    this.id = id;
    this.username = username;
    this.email = email;
    this.password = password;
    this.role = role;
  }
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }
  async comparePassword(password) {
    return await bcrypt.compare(password, this.password);
  }
}
module.exports = User;

class RoadIncident {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.type = data.type;
    this.severity = data.severity || "medium";
    this.status = data.status || "active";
    this.city = data.city;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.userId = data.userId;
    this.user = data.user;
    this.statusHistories = data.statusHistories || [];
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
  isValid() {
    const requiredFields = [
      "title",
      "description",
      "type",
      "city",
      "latitude",
      "longitude",
      "userId",
    ];
    return requiredFields.every((field) => this[field] !== undefined);
  }
  canBeClosedBy(userRole) {
    return ["admin", "moderator"].includes(userRole);
  }
  canBeVerifiedBy(userRole) {
    return ["admin", "moderator"].includes(userRole);
  }
  isActive() {
    return this.status === "active";
  }
  isResolved() {
    return this.status === "resolved";
  }
  isClosed() {
    return this.status === "closed";
  }
  isHighSeverity() {
    return ["high", "critical"].includes(this.severity);
  }
}
module.exports = RoadIncident;

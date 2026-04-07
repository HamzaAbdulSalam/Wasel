class Update {
  constructor(
    id,
    userId,
    hazardId,
    city,
    description,
    latitude,
    longitude,
    status,
    createdAt,
  ) {
    this.id = id;
    this.userId = userId;
    this.hazardId = hazardId;
    this.city = city;
    this.description = description;
    this.latitude = latitude;
    this.longitude = longitude;
    this.status = status || "active";
    this.createdAt = createdAt;
  }
}

module.exports = Update;

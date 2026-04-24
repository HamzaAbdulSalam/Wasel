class Report {
  constructor(
    id,
    category,
    description,
    city,
    latitude,
    longitude,
    userId,
    status = "active",
    credibilityScore = 0,
    isDuplicate = false,
    duplicateOf = null,
    createdAt,
  ) {
    this.id = id;
    this.category = category;
    this.description = description;
    this.city = city;
    this.latitude = latitude;
    this.longitude = longitude;
    this.userId = userId;
    this.status = status;
    this.credibilityScore = credibilityScore;
    this.isDuplicate = isDuplicate;
    this.duplicateOf = duplicateOf;
    this.createdAt = createdAt;
  }
}
module.exports = Report;

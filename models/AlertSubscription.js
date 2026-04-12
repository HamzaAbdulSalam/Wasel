class AlertSubscription {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.geographicArea = data.geographicArea;
    this.incidentCategory = data.incidentCategory;
    this.radiusKm = data.radiusKm;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.notificationMethod = data.notificationMethod || "in_app";
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  isValid() {
    return (
      this.userId &&
      this.geographicArea &&
      this.incidentCategory &&
      (this.incidentCategory === "all" || this.incidentCategory === "location_based" ||
       ["closure", "delay", "accident", "weather_hazard", "maintenance", "other"].includes(this.incidentCategory))
    );
  }

  // Check if this subscription matches an incident
  matchesIncident(incident) {
    // Check geographic area match
    const geographicMatch = this.geographicArea === incident.city ||
                           this.geographicArea === "all";

    // Check incident category match
    const categoryMatch = this.incidentCategory === "all" ||
                         this.incidentCategory === incident.type;

    // Check location-based match if radius is specified
    let locationMatch = true;
    if (this.radiusKm && this.latitude && this.longitude) {
      const distance = this.calculateDistance(
        this.latitude,
        this.longitude,
        incident.latitude,
        incident.longitude
      );
      locationMatch = distance <= this.radiusKm;
    }

    return geographicMatch && categoryMatch && locationMatch;
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = AlertSubscription;
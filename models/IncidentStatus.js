class IncidentStatus {
  constructor(data) {
    this.id = data.id;
    this.incidentId = data.incidentId;
    this.previousStatus = data.previousStatus;
    this.newStatus = data.newStatus;
    this.reason = data.reason;
    this.userId = data.userId;
    this.user = data.user;
    this.createdAt = data.createdAt;
  }
  isValid() {
    return (
      this.incidentId &&
      this.previousStatus &&
      this.newStatus &&
      this.userId
    );
  }
  isStatusTransitionValid() {
    const validTransitions = {
      active: ["verified", "closed"],
      verified: ["resolved", "closed"],
      resolved: ["closed"],
      closed: [],
    };
    return validTransitions[this.previousStatus]?.includes(this.newStatus) ?? false;
  }
}
module.exports = IncidentStatus;

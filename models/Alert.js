class Alert {
  constructor(data) {
    this.id = data.id;
    this.subscriptionId = data.subscriptionId;
    this.incidentId = data.incidentId;
    this.title = data.title;
    this.message = data.message;
    this.priority = data.priority || "normal";
    this.isRead = data.isRead !== undefined ? data.isRead : false;
    this.sentAt = data.sentAt;
    this.createdAt = data.createdAt;
    this.subscription = data.subscription;
    this.incident = data.incident;
  }
  isValid() {
    return (
      this.subscriptionId &&
      this.incidentId &&
      this.title &&
      this.message
    );
  }
  markAsRead() {
    this.isRead = true;
  }
  markAsSent() {
    this.sentAt = new Date();
  }
}
module.exports = Alert;
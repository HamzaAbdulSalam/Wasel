class Checkpoint {
  constructor(id, updateId, checkpointType, description, loggedBy, createdAt) {
    this.id = id;
    this.updateId = updateId;
    this.checkpointType = checkpointType;
    this.description = description;
    this.loggedBy = loggedBy;
    this.createdAt = createdAt;
  }
}
module.exports = Checkpoint;

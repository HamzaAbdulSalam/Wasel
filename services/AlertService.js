const AlertSubscriptionRepository = require('../repos/AlertSubscriptionRepository');
const AlertRepository = require('../repos/AlertRepository');
const AlertSubscription = require('../models/AlertSubscription');
const Alert = require('../models/Alert');
const Joi = require('joi');
class AlertService {
  getSubscriptionValidationSchema() {
    return Joi.object({
      geographicArea: Joi.string().min(1).max(100).required(),
      incidentCategory: Joi.string()
        .valid('all', 'closure', 'delay', 'accident', 'weather_hazard', 'maintenance', 'other')
        .required(),
      radiusKm: Joi.number().min(0.1).max(100).optional(),
      latitude: Joi.when('radiusKm', {
        is: Joi.exist(),
        then: Joi.number().min(-90).max(90).required(),
        otherwise: Joi.forbidden(),
      }),
      longitude: Joi.when('radiusKm', {
        is: Joi.exist(),
        then: Joi.number().min(-180).max(180).required(),
        otherwise: Joi.forbidden(),
      }),
      notificationMethod: Joi.string()
        .valid('in_app', 'email', 'push')
        .default('in_app'),
    });
  }
  async createSubscription(userId, subscriptionData) {
    const schema = this.getSubscriptionValidationSchema();
    const { error, value } = schema.validate(subscriptionData);
    if (error) throw new Error(error.details[0].message);
    const subscription = new AlertSubscription({
      ...value,
      userId,
    });
    if (!subscription.isValid()) {
      throw new Error('Invalid subscription data');
    }
    const created = await AlertSubscriptionRepository.create(subscription);
    return created;
  }
  async getUserSubscriptions(userId, page = 1, limit = 10) {
    return await AlertSubscriptionRepository.findByUserId(userId, page, limit);
  }
  async updateSubscription(subscriptionId, userId, updateData) {
    const subscription = await AlertSubscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    if (subscription.userId !== userId) {
      throw new Error('Unauthorized to update this subscription');
    }
    const schema = this.getSubscriptionValidationSchema();
    const { error, value } = schema.validate(updateData);
    if (error) throw new Error(error.details[0].message);
    const updated = await AlertSubscriptionRepository.update(subscriptionId, value);
    return updated;
  }
  async deleteSubscription(subscriptionId, userId) {
    const subscription = await AlertSubscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    if (subscription.userId !== userId) {
      throw new Error('Unauthorized to delete this subscription');
    }
    await AlertSubscriptionRepository.delete(subscriptionId);
    return true;
  }
  async deactivateSubscription(subscriptionId, userId) {
    const subscription = await AlertSubscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    if (subscription.userId !== userId) {
      throw new Error('Unauthorized to deactivate this subscription');
    }
    return await AlertSubscriptionRepository.deactivate(subscriptionId);
  }
  async triggerAlertsForIncident(incident) {
    if (incident.status !== 'verified') {
      return;
    }
    const subscriptions = await AlertSubscriptionRepository.findActiveSubscriptions();
    for (const subscription of subscriptions) {
      if (subscription.matchesIncident(incident)) {
        const alert = new Alert({
          subscriptionId: subscription.id,
          incidentId: incident.id,
          title: `New ${incident.type} incident in ${incident.city}`,
          message: `${incident.title}: ${incident.description.substring(0, 100)}...`,
          priority: this.getPriorityFromSeverity(incident.severity),
        });
        const createdAlert = await AlertRepository.create(alert);
        triggeredAlerts.push(createdAlert);
        console.log(`Alert triggered for user ${subscription.userId}: ${alert.title}`);
      }
    }
    return triggeredAlerts;
  }
  getPriorityFromSeverity(severity) {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'normal';
      case 'low':
        return 'low';
      default:
        return 'normal';
    }
  }
  async getUserAlerts(userId, options = {}) {
    return await AlertRepository.findByUserId(userId, options);
  }
  async markAlertAsRead(alertId, userId) {
    const alert = await AlertRepository.findById(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }
    if (alert.subscription.userId !== userId) {
      throw new Error('Unauthorized to access this alert');
    }
    return await AlertRepository.markAsRead(alertId);
  }
  async getUnreadAlertCount(userId) {
    return await AlertRepository.getUnreadCount(userId);
  }
  async markAlertAsSent(alertId) {
    return await AlertRepository.markAsSent(alertId);
  }
}
module.exports = new AlertService();
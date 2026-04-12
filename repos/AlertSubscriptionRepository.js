const { PrismaClient } = require('@prisma/client');
const AlertSubscription = require('../models/AlertSubscription');

class AlertSubscriptionRepository {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(alertSubscription) {
    const data = {
      userId: alertSubscription.userId,
      geographicArea: alertSubscription.geographicArea,
      incidentCategory: alertSubscription.incidentCategory,
      radiusKm: alertSubscription.radiusKm,
      latitude: alertSubscription.latitude,
      longitude: alertSubscription.longitude,
      isActive: alertSubscription.isActive,
      notificationMethod: alertSubscription.notificationMethod,
    };

    const created = await this.prisma.alertSubscription.create({
      data,
    });

    return new AlertSubscription(created);
  }

  async findById(id) {
    const subscription = await this.prisma.alertSubscription.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return subscription ? new AlertSubscription(subscription) : null;
  }

  async findByUserId(userId) {
    const subscriptions = await this.prisma.alertSubscription.findMany({
      where: { userId: parseInt(userId), isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map(sub => new AlertSubscription(sub));
  }

  async findActiveSubscriptions() {
    const subscriptions = await this.prisma.alertSubscription.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return subscriptions.map(sub => new AlertSubscription(sub));
  }

  async update(id, updateData) {
    const updated = await this.prisma.alertSubscription.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return new AlertSubscription(updated);
  }

  async delete(id) {
    await this.prisma.alertSubscription.delete({
      where: { id: parseInt(id) },
    });

    return true;
  }

  async deactivate(id) {
    return await this.update(id, { isActive: false });
  }
}

module.exports = new AlertSubscriptionRepository();
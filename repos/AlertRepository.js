require("dotenv").config();
const { PrismaClient } = require('@prisma/client');
const Alert = require('../models/Alert');

class AlertRepository {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(alert) {
    const data = {
      subscriptionId: alert.subscriptionId,
      incidentId: alert.incidentId,
      title: alert.title,
      message: alert.message,
      priority: alert.priority,
      isRead: alert.isRead,
      sentAt: alert.sentAt,
    };

    const created = await this.prisma.alert.create({
      data,
      include: {
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        incident: {
          select: {
            id: true,
            title: true,
            type: true,
            severity: true,
            city: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    return new Alert(created);
  }

  async findById(id) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: parseInt(id) },
      include: {
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        incident: {
          select: {
            id: true,
            title: true,
            type: true,
            severity: true,
            city: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    return alert ? new Alert(alert) : null;
  }

  async findByUserId(userId, options = {}) {
    const { page = 1, limit = 10, isRead } = options;

    const where = {
      subscription: {
        userId: parseInt(userId),
      },
    };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const alerts = await this.prisma.alert.findMany({
      where,
      include: {
        subscription: true,
        incident: {
          select: {
            id: true,
            title: true,
            type: true,
            severity: true,
            city: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.alert.count({ where });

    return {
      alerts: alerts.map(alert => new Alert(alert)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findBySubscriptionId(subscriptionId, options = {}) {
    const { page = 1, limit = 10 } = options;

    const alerts = await this.prisma.alert.findMany({
      where: { subscriptionId: parseInt(subscriptionId) },
      include: {
        incident: {
          select: {
            id: true,
            title: true,
            type: true,
            severity: true,
            city: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.alert.count({
      where: { subscriptionId: parseInt(subscriptionId) },
    });

    return {
      alerts: alerts.map(alert => new Alert(alert)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(id) {
    const updated = await this.prisma.alert.update({
      where: { id: parseInt(id) },
      data: { isRead: true },
    });

    return new Alert(updated);
  }

  async markAsSent(id) {
    const updated = await this.prisma.alert.update({
      where: { id: parseInt(id) },
      data: { sentAt: new Date() },
    });

    return new Alert(updated);
  }

  async delete(id) {
    await this.prisma.alert.delete({
      where: { id: parseInt(id) },
    });

    return true;
  }

  async getUnreadCount(userId) {
    return await this.prisma.alert.count({
      where: {
        subscription: {
          userId: parseInt(userId),
        },
        isRead: false,
      },
    });
  }
}

module.exports = new AlertRepository();
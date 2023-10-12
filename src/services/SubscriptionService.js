const {
  Subscription,
} = require('../models');

class SubscriptionService {
  static async create(subscription) {
    const response = await Subscription.create(subscription);
    return response;
  }

  static async get(subscription) {
    return subscription;
  }

  static async delete(subscription) {
    return `${subscription} deleted`;
  }

  static async update(subscription) {
    return subscription;
  }
}

module.exports = SubscriptionService;

const { Subscription } = require('../models');

class SubscriptionServices {
  static async addSubscription(newCampaign) {
    return Subscription.create(newCampaign);
  }

  static async getAllSubscriptions(queryClause = null) {
    return Subscription.findAll({
      order: [['createdAt', 'DESC']],
      where: {
        ...queryClause,
      },
      include: ['Transaction'],
    });
  }

  static async getSubByIdWithPlan(id) {
    return Subscription.findByPk(id, {
      include: ['Plan'],
    });
  }

  static async getSubscriptionById(id) {
    return Subscription.findOne({ where: { id } });
  }

  static async updateSubscription(id, updateSubs) {
    const SubscriptionToUpdate = await Subscription.findOne({
      where: {
        id: Number(id),
      },
    });

    if (SubscriptionToUpdate) {
      const response = await Subscription.update(updateSubs, {
        where: {
          id: Number(id),
        },
      });
      return response;
    }
    return null;
  }

  static async getAPlan(id) {
    return Subscription.findAll({
      where: {
        id: Number(id),
      },
      include: ['Subscription'],
    });
  }

  static async deleteSubscription(id) {
    const SubscriptionToDelete = await Subscription.findOne({
      where: {
        id: Number(id),
      },
    });

    if (SubscriptionToDelete) {
      const deletedSub = await Subscription.destroy({
        where: {
          id: Number(id),
        },
      });
      return deletedSub;
    }
    return null;
  }
}

module.exports = SubscriptionServices;

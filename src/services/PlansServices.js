const { Plan } = require('../models');

class PlanService {
  static async addPlan(newPlan) {
    return Plan.create(newPlan);
  }

  static async getAllPlan(queryClause = null) {
    return Plan.findAll({
      order: [['createdAt', 'DESC']],
      where: {
        ...queryClause,
      },
      include: ['Subscriptions'],
    });
  }

  static async getPlanByIdWithSub(id) {
    return Plan.findByPk(id, {
      include: ['Subscriptions'],
    });
  }

  static async getPlanById(id) {
    return Plan.findOne({ where: { id } });
  }

  static async updatePlan(id, updatePlan) {
    const PlanToUpdate = await Plan.findOne({
      where: {
        id: Number(id),
      },
    });

    if (PlanToUpdate) {
      const response = await Plan.update(updatePlan, {
        where: {
          id: Number(id),
        },
      });
      return response;
    }
    return null;
  }

  static async getAPlan(id) {
    return Plan.findAll({
      where: {
        id: Number(id),
      },
      include: ['Subscription'],
    });
  }

  static async deletePlan(id) {
    const PlanToDelete = await Plan.findOne({
      where: {
        id: Number(id),
      },
    });

    if (PlanToDelete) {
      const deletedPlan = await Plan.destroy({
        where: {
          id: Number(id),
        },
      });
      return deletedPlan;
    }
    return null;
  }
}

module.exports = PlanService;

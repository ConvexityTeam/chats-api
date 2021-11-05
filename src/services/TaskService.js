const { Campaign, Tasks, TaskUsers, User } = require('../models');
const { publicAttr } = require('../constants/user.constants');

class TaskService {

  static async createCashForWorkTask(tasks, campaignId) {

    // check if campaign exists
    const campaign = await Campaign.findOne({
      where: {
        id: campaignId,
        type: "cash-for-work"
      }
    });

    if (!campaign)
      throw new Error("Invalid campaign id");

    if (campaign.status == "completed")
      throw new Error("Campaign is already completed");

    tasks.forEach(task => {
      task.CampaignId = campaignId
    });

    return Tasks.bulkCreate(tasks);
  }

  static async getCashForWorkTasks(params) {

    return Tasks.findAndCountAll({
      where: {
        CampaignId: params.campaign_id
      },
      include: [
        {
          model: TaskUsers,
          as: 'AssociatedWorkers',
          attributes: [],
          include: [
            {
              model: User,
              as: 'Worker',
              attributes: publicAttr
            }
          ]
        }
      ]
    });
  }

  static async updateTask(id, updateTaskObj) {
    const task = await Tasks.findByPk(id);
    if (!task)
      throw new Error("Invalid task id");

    return task.update(updateTaskObj);
  }

}

module.exports = TaskService;
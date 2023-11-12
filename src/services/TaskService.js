const {
  Campaign,
  Task,
  TaskUsers,
  User,
  TaskProgress,
  TaskProgressEvidence,
  Sequelize
} = require('../models');
const {publicAttr} = require('../constants/user.constants');
const Pagination = require('../utils/pagination');

class TaskService {
  static async createCashForWorkTask(tasks, campaignId) {
    // check if campaign exists

    const campaign = await Campaign.findOne({
      where: {
        id: campaignId,
        type: 'cash-for-work'
      }
    });

    if (!campaign) throw new Error('Invalid campaign id');

    if (campaign.status == 'completed')
      throw new Error('Campaign is already completed');
    if (campaign.status == 'ended')
      throw new Error('Campaign is already ended');

    const _tasks = tasks.map(task => {
      task.CampaignId = campaignId;
      return task;
    });

    return Task.bulkCreate(_tasks);
  }
  static async getTaskByUUID(uuid) {
    return Task.findOne({
      where: {
        uuid
      }
    });
  }
  static async getCashForWorkTasks(params, extraClause = {}) {
    const page = extraClause.page;
    const size = extraClause.size;

    const {limit, offset} = await Pagination.getPagination(page, size);
    delete extraClause.page;
    delete extraClause.size;
    let queryOptions = {};
    if (page && size) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }
    const tasks = await Task.findAndCountAll({
      ...queryOptions,
      distinct: true,
      where: {
        CampaignId: params.campaign_id
      },
      include: [
        {
          model: User,
          as: 'AssignedWorkers',
          attributes: publicAttr
        }
      ]
    });
    const response = await Pagination.getPagingData(tasks, page, limit);
    return response;
  }

  static async getCashForBeneficiaries(params, extraClause = {}) {
    const page = extraClause.page;
    const size = extraClause.size;

    const {limit, offset} = await Pagination.getPagination(page, size);
    // delete extraClause.page;
    // delete extraClause.size;
    // let queryOptions = {};
    // if (page && size) {
    //   queryOptions.limit = limit;
    //   queryOptions.offset = offset;
    // }

    const task = await Task.findOne({
      where: {
        id: params.task_id
      },
      include: [
        {
          // ...queryOptions,
          model: User,
          as: 'AssignedWorkers',
          attributes: publicAttr
        }
      ]
    });

    // Apply limit and offset to the associated records
    if (page && size) {
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      task.AssignedWorkers = task.AssignedWorkers.slice(startIndex, endIndex);
    }

    const response = await Pagination.getPagingData(
      {rows: task?.AssignedWorkers, count: task?.AssignedWorkers?.length},
      page,
      limit
    );

    return {task, response};
  }
  //develop

  static async updateTask(id, updateTaskObj) {
    const task = await Task.findByPk(id);
    if (!task) throw new Error('Invalid task id');

    return task.update(updateTaskObj);
  }

  static async uploadProgressEvidence(taskProgressId, imageUrl) {
    const taskProgress = await TaskProgress.findOne({uuid: taskProgressId});

    if (!taskProgress) {
      throw new Error('No progress task found');
    } else
      return await TaskProgressEvidence.create({
        TaskProgressId: taskProgressId,
        imageUrl
      });
  }
}

module.exports = TaskService;

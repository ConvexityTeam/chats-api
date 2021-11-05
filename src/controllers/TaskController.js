const { TaskService } = require('../services');
const util = require("../libs/Utils");
const { SanitizeObject } = require('../utils');

class TaskController {
  static async createCashForWorkTask(req, res) {
    try {

      const tasks = req.body;
      const campaignId = req.params.campaign_id;
      const createdTasks = await TaskService.createCashForWorkTask(tasks, campaignId);

      util.setSuccess(200, "Tasks created successfully", createdTasks);
      return util.send(res);
    }
    catch (error) {
      util.setError(400, error.message);
      return util.send(res);
    }
  }

  static async getCashForWorkTasks(req, res) {
    try {
      const params = SanitizeObject(req.params);
      const CashForWorkTasks = await TaskService.getCashForWorkTasks(params);

      util.setSuccess(200, "CashForWork Campaign Tasks retreived", CashForWorkTasks);
      return util.send(res);
    }
    catch (error) {
      util.setError(400, error.message);
      return util.send(res);
    }
  }

  static async updateTask(req, res) {
    try {
      const task = req.body;
      const taskId = req.params.task_id;
      const updatedTask = await TaskService.updateTask(taskId, task);

      util.setSuccess(200, "Task updated", updatedTask);
      return util.send(res);
    }
    catch (error) {
      util.setError(400, error.message);
      return util.send(res);
    }
  }

}

module.exports = TaskController;
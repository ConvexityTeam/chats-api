const { Response } = require('../libs');
const { TaskService } = require('../services');
const { SanitizeObject, HttpStatusCode } = require('../utils');

class TaskController {
  static async createCashForWorkTask(req, res) {
    try {

      const tasks = req.body;
      const campaignId = req.params.campaign_id;
      const createdTasks = await TaskService.createCashForWorkTask(tasks, campaignId);
      Response.setSuccess(HttpStatusCode.STATUS_CREATED, "Tasks created successfully", createdTasks);
      return Response.send(res);
    }
    catch (error) {
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, error.message);
      return Response.send(res);
    }
  }

  static async getCashForWorkTasks(req, res) {
    try {
      const params = SanitizeObject(req.params);
      const CashForWorkTasks = await TaskService.getCashForWorkTasks(params);

      Response.setSuccess(HttpStatusCode.STATUS_OK, "CashForWork Campaign Tasks retreived", CashForWorkTasks);
      return Response.send(res);
    }
    catch (error) {
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, error.message);
      return Response.send(res);
    }
  }

  static async updateTask(req, res) {
    try {
      const task = req.body;
      const taskId = req.params.task_id;
      const updatedTask = await TaskService.updateTask(taskId, task);

      Response.setSuccess(HttpStatusCode.STATUS_OK, "Task updated", updatedTask);
      return Response.send(res);
    }
    catch (error) {
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, error.message);
      return Response.send(res);
    }
  }
}

module.exports = TaskController;
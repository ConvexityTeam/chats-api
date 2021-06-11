const CampaignService = require("../services/CampaignService");
const util = require("../libs/Utils");
const db = require("../models");
const Validator = require("validatorjs");
const { Op } = require("sequelize");
const formidable = require("formidable");
const uploadFile = require("./AmazonController");
var amqp_1 = require("./../libs/RabbitMQ/Connection");
const { Message } = require("@droidsolutions-oss/amqp-ts");
var transferToQueue = amqp_1["default"].declareQueue("transferTo", {
  durable: true,
});
const environ = process.env.NODE_ENV == "development" ? "d" : "p";

class CashForWorkController {
  constructor() {}

  static async newTask(req, res) {
    try {
      const data = req.body;

      const rules = {
        name: "required|string",
        description: "required|string",
        campaign: "required|numeric",
        amount: "required|numeric",
      };

      const validation = new Validator(data, rules);

      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        const campaignExist = await db.Campaign.findOne({
          where: { id: data.campaign, type: "cash-for-work" },
          include: { model: db.Tasks, as: "Jobs" },
        });

        if (!campaignExist) {
          util.setError(400, "Invalid Cash-for-Work Id");
          return util.send(res);
        }

        if (campaignExist.Jobs.length) {
          const names = campaignExist.Jobs.map((element) => {
            return String(element.name).toLowerCase();
          });
          if (names.includes(String(data.name).toLowerCase())) {
            util.setError(
              400,
              "A Task with the same name already exist for this Campaign"
            );
            return util.send(res);
          }
        }

        const taskEntity = {
          name: data.name,
          description: data.description,
          amount: data.amount,
        };

        const newTask = await campaignExist.createJob(taskEntity);

        util.setSuccess(201, "Task Added to Campaign Successfully");
        return util.send(res);
      }
    } catch (err) {
      util.setError(500, "An Error Occurred. Please Try Again Later.");
      return util.send(res);
    }
  }

  static async getTasks(req, res) {
    try {
      const campaignId = req.params.campaignId;
      const campaignExist = await db.Campaign.findOne({
        where: { id: campaignId, type: "cash-for-work" },
        include: {
          model: db.Tasks,
          as: "Jobs",
          attributes: { exclude: ["CampaignId"] },
        },
      });

      util.setSuccess(200, "Tasks", { tasks: campaignExist.Jobs });
      return util.send(res);
    } catch (error) {
      util.setError(404, "Invalid Campaign");
      return util.send(res);
    }
  }

  static async getAllCashForWork(req, res) {
    const cashforworks = await db.Campaign.findAll({
      where: {
        type: "cash-for-work",
      },
      include: { model: db.Tasks, as: "Jobs" },
    });

    const cashForWorkArray = [];

    cashforworks.forEach((cashforwork) => {
      const jobs = cashforwork.Jobs;
      const totalTasks = jobs.length;

      const completed = jobs.filter((element) => {
        return element.status == "fulfilled";
      });

      const completedTasks = completed.length;

      const progress = Math.ceil((completedTasks / totalTasks) * 100);

      const cashForWorkDetail = {
        id: cashforwork.id,
        title: cashforwork.title,
        description: cashforwork.description,
        status: cashforwork.status,
        budget: cashforwork.budget,
        totalTasks,
        completedTasks: completedTasks,
        progress,
        location: cashforwork.location,
        start_date: cashforwork.start_date,
        end_date: cashforwork.end_date,
        createdAt: cashforwork.createdAt,
        updatedAt: cashforwork.updatedAt,
      };

      cashForWorkArray.push(cashForWorkDetail);
    });

    util.setSuccess(200, "Campaign retrieved", cashForWorkArray);
    return util.send(res);
  }

  static async getCashForWork(req, res) {
    try {
      const id = req.params.cashforworkid;
      const cashforwork = await db.Campaign.findOne({
        where: {
          id,
          type: "cash-for-work",
        },
        include: { model: db.Tasks, as: "Jobs" },
      });

      const jobs = cashforwork.Jobs;
      const totalTasks = jobs.length;

      const completed = jobs.filter((element) => {
        return element.status == "fulfilled";
      });

      const completedTasks = completed.length;

      const progress = Math.ceil((completedTasks / totalTasks) * 100);

      const cashForWorkDetail = {
        id: cashforwork.id,
        title: cashforwork.title,
        description: cashforwork.description,
        status: cashforwork.status,
        budget: cashforwork.budget,
        totalTasks,
        completedTasks: completedTasks,
        progress,
        location: cashforwork.location,
        start_date: cashforwork.start_date,
        end_date: cashforwork.end_date,
        createdAt: cashforwork.createdAt,
        updatedAt: cashforwork.updatedAt,
      };

      util.setSuccess(200, "Cash-for-work Retrieved", { cashForWorkDetail });
      return util.send(res);
    } catch (error) {
      util.setError(404, "Invalid Cash For Work Id");
      return util.send(res);
    }
  }

  static async getTask(req, res) {
    try {
      const taskId = req.params.taskId;

      const task = await db.Tasks.findOne({
        where: {
          id: taskId,
        },
        attributes: { exclude: ["CampaignId"] },
        include: [
          {
            model: db.Campaign,
            as: "Campaign",
          },
          {
            model: db.TaskUsers,
            as: "AssociatedWorkers",
            attributes: { exclude: ["TaskId"] },
            include: {
              model: db.User,
              as: "Worker",
              attributes: {
                exclude: [
                  "nfc",
                  "password",
                  "dob",
                  "profile_pic",
                  "location",
                  "is_email_verified",
                  "is_phone_verified",
                  "is_bvn_verified",
                  "is_self_signup",
                  "is_public",
                  "is_tfa_enabled",
                  "last_login",
                  "tfa_secret",
                  "bvn",
                  "nin",
                  "pin",
                ],
              },
            },
          },
        ],
      });

      util.setSuccess(200, "Task Retrieved", { task });
      return util.send(res);
    } catch (error) {
      console.log(error.message);

      util.setError(404, "Invalid Task Id");
      return util.send(res);
    }
  }

  static async addWorkersToTask(req, res) {
    try {
      const data = req.body;

      const rules = {
        users: "required|array",
        taskId: "required|numeric",
        "users.*.UserId": "required|numeric",
        "users.*.type": "required|string|in:supervisor,worker",
      };

      const validation = new Validator(data, rules, {
        array: ":attribute field must be an array",
      });

      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        const usersIds = data.users.map((element) => {
          return element.UserId;
        });

        const users = await db.User.findAll({
          where: {
            id: {
              [Op.in]: usersIds,
            },
          },
        });

        if (users.length !== usersIds.length) {
          util.setError(400, "User(s) are invalid");
          return util.send(res);
        }

        const task = await db.Tasks.findOne({
          where: { id: data.taskId },
          include: { model: db.TaskUsers, as: "AssociatedWorkers" },
        });

        if (!task) {
          util.setError(400, "Task Id is Invalid");
          return util.send(res);
        }

        if (task.AssociatedWorkers) {
          const addedUsers = task.AssociatedWorkers.map((element) => {
            return element.UserId;
          });

          const dd = addedUsers.some((el) => {
            return usersIds.includes(el);
          });

          if (dd) {
            util.setError(400, "User(s) has been added to Task already");
            return util.send(res);
          }
        }

        data.users.forEach(async (element) => {
          await task.createAssociatedWorker({
            UserId: element.UserId,
            type: element.type,
          });
        });

        util.setSuccess(200, "Workers added successfully");
        return util.send(res);
      }
    } catch (error) {
      util.setError(500, "Internal Server Error");
      return util.send(res);
    }
  }

  static async submitProgress(req, res) {
    var form = new formidable.IncomingForm({ multiples: true });
    form.parse(req, async (err, fields, files) => {
      const rules = {
        taskId: "required|numeric",
        userId: "required|numeric",
      };

      const validation = new Validator(fields, rules);

      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        if (!Array.isArray(files.images)) {
          util.setError(400, "Minimum of 5 images is allowed");
          return util.send(res);
        }

        if (files.images.length < 5) {
          util.setError(400, "Minimum of 5 images is allowed");
          return util.send(res);
        }

        const task = await db.Tasks.findByPk(fields.taskId);

        if (task.status == "fulfilled") {
          util.setError(
            400,
            "Task has been fulfilled. No need for an approval request"
          );
          return util.send(res);
        }

        const workerRecord = await db.TaskUsers.findOne({
          where: { TaskId: fields.taskId, UserId: fields.userId },
          include: { model: db.TaskProgress, as: "CompletionRequest" },
        });

        if (!workerRecord) {
          util.setError(
            400,
            "Task Id is Invalid/User has not been added to this task"
          );
          return util.send(res);
        }

        const records = await db.TaskUsers.findAll({
          where: {
            UserId: fields.userId,
            TaskId: fields.taskId,
          },
        });

        const recordIds = records.map((element) => {
          return element.id;
        });

        const request = await db.TaskProgress.findOne({
          where: {
            TaskUserId: {
              [Op.in]: recordIds,
            },
          },
        });

        if (request) {
          util.setError(
            400,
            "Progress Report has already been submitted for this task"
          );
          return util.send(res);
        }

        let i = 0;
        let uploadFilePromises = [];
        files.images.forEach(async (image) => {
          let ext = image.name.substring(image.name.lastIndexOf(".") + 1);
          uploadFilePromises.push(
            uploadFile(
              image,
              "pge-" + environ + "-" + fields.taskId + ++i + "." + ext,
              "convexity-progress-evidence"
            )
          );
        });

        Promise.all(uploadFilePromises).then(async (responses) => {
          await workerRecord
            .createCompletionRequest()
            .then((progressReport) => {
              responses.forEach(async (url) => {
                await progressReport.createEvidence({ imageUrl: url });
              });
            });
        });
        let status = "";

        if (workerRecord.type == "supervisor") {
          const task = await db.Tasks.findByPk(fields.taskId);
          task.status = "fulfilled";
          task.save();
        }

        util.setSuccess(201, "Progress Report Submitted");
        return util.send(res);
      }
    });
  }

  static async approveProgress(req, res) {
    try {
      const data = req.body;
      const rules = {
        userId: "required|numeric",
        taskId: "required|numeric",
      };

      const validation = new Validator(data, rules);

      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        const workerRecord = await db.TaskUsers.findOne({
          where: {
            UserId: data.userId,
            TaskId: data.taskId,
            type: "supervisor",
          },
        });

        if (!workerRecord) {
          util.setError(400, "Unauthorized! User is not a supervisor");
          return util.send(res);
        }

        const task = await db.Tasks.findByPk(data.taskId);
        task.status = "fulfilled";
        task.save();

        util.setError(200, "Completion Request successfully approved");
        return util.send(res);
      }
    } catch (err) {
      console.log(err.message);
      util.setError(500, "Internal Server Error");
      return util.send(res);
    }
  }

  static async payWages(req, res) {
    try {
      const data = req.body;

      const rules = {
        taskId: "required|numeric",
      };

      const validation = new Validator(data, rules);

      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        const taskExist = await db.Tasks.findOne({
          where: { id: data.taskId },
          include: [
            {
              as: "Campaign",
              model: db.Campaign,
              include: {
                model: db.OrganisationMembers,
                as: "OrganisationMember",
              },
            },
            {
              model: db.TaskUsers,
              as: "AssociatedWorkers",
            },
            {
              model: db.Transaction,
              as: "Transaction",
            },
          ],
        });

        if (!taskExist) {
          util.setError(400, "Invalid Task Id");
          return util.send(res);
        }

        const isMember = await db.OrganisationMembers.findOne({
          where: {
            OrganisationId:
              taskExist.Campaign.OrganisationMember.OrganisationId,
            UserId: req.user.id,
          },
        });

        if (taskExist.Transaction.length) {
          util.setError(422, "Payments has already been initiated for Workers");
          return util.send(res);
        }

        if (!isMember) {
          util.setError(401, "Unauthorised! Not a staff of the organisation");
          return util.send(res);
        }

        if (!taskExist) {
          util.setError(422, "Invalid Task");
          return util.send(res);
        }

        if (!taskExist.AssociatedWorkers.length) {
          util.setError(
            422,
            "No Worker Added to Task, Therefore Wages cannot be paid"
          );
          return util.send(res);
        }

        const userIds = taskExist.AssociatedWorkers.map((el) => {
          return el.UserId;
        });

        const workersWallets = await db.Wallet.findAll({
          where: {
            AccountUserId: {
              [Op.in]: userIds,
            },
            CampaignId: null,
            AccountUserType: "user",
          },
        });

        const ngoWallet = await db.Wallet.findOne({
          where: {
            AccountUserId: taskExist.Campaign.OrganisationMember.OrganisationId,
            CampaignId: taskExist.Campaign.id,
            AccountUserType: "organisation",
          },
        });

        const totalAmount = taskExist.amount * workersWallets.length;

        if (totalAmount > ngoWallet.balance) {
          util.setError(
            400,
            "Ngo Wallet Balance is insufficient for this transaction"
          );
          return util.send(res);
        }

        workersWallets.forEach(async (wallet) => {
          await taskExist
            .createTransaction({
              walletSenderId: ngoWallet.uuid,
              walletRecieverId: wallet.uuid,
              amount: taskExist.amount,
              narration: "Wages for " + taskExist.name + " task ",
            })
            .then((transaction) => {
              transferToQueue.send(
                new Message(
                  {
                    senderAddress: ngoWallet.address,
                    senderPass: ngoWallet.privateKey,
                    reciepientAddress: wallet.address,
                    amount: taskExist.amount,
                    transaction: transaction.uuid,
                  },
                  { contentType: "application/json" }
                )
              );
            });
        });

        util.setSuccess(200, "Payment Initiated");
        return util.send(res);
      }
    } catch (error) {
      console.log(error.message);
      util.setError(500, "Internal Server Error");
      return util.send(res);
    }
  }
}

module.exports = CashForWorkController;

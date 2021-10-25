const db = require("../models");
const util = require("../libs/Utils");
const Validator = require("validatorjs");

class AdminController {
  static async updateUserStatus(req, res) {
    const data = req.body;
    const rules = {
      userId: "required|numeric",
      status: "required|string|in:activated,suspended,pending",
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const userExist = await db.User.findOne({ where: { id: data.userId } });
      if (userExist) {
        await userExist.update({ status: data.status }).then((response) => {
          util.setError(200, "User Updated");
          return util.send(res);
        });
      } else {
        util.setError(404, "Invalid User Id", error);
        return util.send(res);
      }
    }
  }

  static async updateCampaignStatus(req, res) {
    const data = req.body;
    const rules = {
      campaignId: "required|numeric",
      status: "required|string|in:in-progress,paused,pending",
    };

    const validation = new Validator(data, rules);
    if (validation.fails()) {
      util.setError(422, validation.errors);
      return util.send(res);
    } else {
      const campaignExist = await db.Campaign.findOne({
        where: { id: data.campaignId },
      });
      if (campaignExist) {
        await campaignExist.update({ status: data.status }).then((response) => {
          util.setError(200, "Campaign Status Updated");
          return util.send(res);
        });
      } else {
        util.setError(404, "Invalid Campaign Id", error);
        return util.send(res);
      }
    }
  }
}

module.exports = AdminController;

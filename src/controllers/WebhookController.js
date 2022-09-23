const {HttpStatusCode} = require('../utils');
const {Logger} = require('../libs');
const {WebhookService} = require('../services');


class WebhookController {
  static async verifyPaystackDeposit(req, res) {
    try {
      await WebhookService.verifyPaystackDeposit(req.body);
      res.sendStatus(HttpStatusCode.STATUS_OK);
      Logger.info(`Organisation PayStack Deposit Verified`)
    } catch (err) {
      console.log(err);
      Logger.error(`Error Verifying Organisation PayStack Deposit: ${err}`)
      res.sendStatus(HttpStatusCode.STATUS_BAD_REQUEST);
    }
  }

  static async verifyPaystackCampaignDeposit(req, res) {
    const {campaign_id} = req.params;
    req.body.campaign_id = campaign_id;
    try {
      await WebhookService.verifyPaystackCampaignDeposit(req.body);
      res.sendStatus(HttpStatusCode.STATUS_OK);
      Logger.info(`Campaign PayStack Deposit Verified`)
    } catch (err) {
      Logger.error(`Error Verifying Campaign PayStack Deposit: ${err}`)
      res.sendStatus(HttpStatusCode.STATUS_BAD_REQUEST);
    }
  }
}

module.exports = WebhookController;

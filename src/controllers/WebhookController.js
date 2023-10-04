const {HttpStatusCode} = require('../utils');
const {Logger} = require('../libs');
const {WebhookService, BlockchainService} = require('../services');

class WebhookController {
  static async verifyFiatDeposit(req, res) {
    try {
      const {method} = req.body.data.metadata;
      await WebhookService.verifyFiatDeposit(req.body);
      res.sendStatus(HttpStatusCode.STATUS_OK);
      Logger.info(
        `${method === 'koyapay' ? 'KoraPay' : 'Paystack'} Deposit Verified`
      );
    } catch (err) {
      console.log(err);
      Logger.error(
        `Error Verifying ${
          method === 'koyapay' ? 'KoraPay' : 'Paystack'
        } Deposit: ${err}`
      );
      res.sendStatus(HttpStatusCode.STATUS_BAD_REQUEST);
    }
  }

  static async verifyPaystackCampaignDeposit(req, res) {
    const {campaign_id} = req.params;
    req.body.campaign_id = campaign_id;
    try {
      await WebhookService.verifyPaystackCampaignDeposit(req.body);
      res.sendStatus(HttpStatusCode.STATUS_OK);
      Logger.info(`Campaign PayStack Deposit Verified`);
    } catch (err) {
      Logger.error(`Error Verifying Campaign PayStack Deposit: ${err}`);
      res.sendStatus(HttpStatusCode.STATUS_BAD_REQUEST);
    }
  }

  static async verifyWalletDeposit(req, res) {
    try {
      const wallet = await BlockchainService.switchWebhook('some data');
      res.sendStatus(HttpStatusCode.STATUS_OK);
      Logger.info(`Switch Wallet Deposit Verified`);
    } catch (error) {
      Logger.error(
        `Error Verifying Switch Wallet Deposit: ${JSON.stringify(error)}`
      );
      res.sendStatus(HttpStatusCode.STATUS_BAD_REQUEST);
    }
  }
}

module.exports = WebhookController;

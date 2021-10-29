const {
  FundAccount
} = require("../models");
const QueueService = require('./QueueService');

class WebhookService {
  static async verifyPaystackDeposit(data) {
    if (data.event == 'charge.success') {
      const transactionReference = data.data.reference;
      const record = await FundAccount.findOne({
        where: {
          transactionReference
        }
      });

      if (record) {
        await record.update({
          approved: true
        });
        record.dataValues.approved = true;
        QueueService.verifyFiatDeposit(record);
        return record;
      }
      return null;
    }
    return null;
  }
}

module.exports = WebhookService;
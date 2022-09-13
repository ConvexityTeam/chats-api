const {
  HttpStatusCode
} = require("../utils");
const { WebhookService } = require("../services");

class WebhookController {
  static async verifyPaystackDeposit(req, res) {
    try {
      await WebhookService.verifyPaystackDeposit(req.body);
      res.sendStatus(HttpStatusCode.STATUS_OK)
    } catch (err) {
      console.log(err);
      res.sendStatus(HttpStatusCode.STATUS_BAD_REQUEST)
    }
  }
}

module.exports = WebhookController;
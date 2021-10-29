const {
  HttpStatusCode
} = require("../utils");
const { WebhookService } = require("../services");

class WebhookController {
  static async verifyPaystackDeposit(req, res) {
    try {
      WebhookService.verifyPaystackDeposit(req.body);
      res.send(HttpStatusCode.STATUS_OK)
    } catch (err) {
      res.send(HttpStatusCode.STATUS_BAD_REQUEST)
    }
  }
}

module.exports = WebhookController;
const {Response} = require('../libs');
const KoraPayService = require('../services/KoraPayService');
const {HttpStatusCode} = require('../utils');

class KoraPayController {
  static async cardPayment(req, res) {
    const data = req.body;
    try {
      const pay = await KoraPayService.cardPayment(data);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Payment successful',
        pay
      );
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.' + error
      );
      return Response.send(res);
    }
  }
}

module.exports = KoraPayController;

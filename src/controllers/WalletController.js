const { PaystackService} = require('../services');
const {Response} = require('../libs');
const { HttpStatusCode } = require('../utils');
class WalletController {
  static async paystackDeposit(req, res) {
    try {
      const {organisation, body: {amount, currency}} = req;
      organisation.dataValues.email = req.user.email;
      const data = await PaystackService.buildDepositData(organisation, amount, currency);
      Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'Deposit data generated.', data);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Request failed. Please retry.');
      return Response.send(res);
    }
  }
}

module.exports = WalletController;
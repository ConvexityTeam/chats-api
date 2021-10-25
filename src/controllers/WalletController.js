const { PaystackService} = require('../services');
const {Response} = require('../libs');
class WalletController {
  static async paystackDeposit(req, res) {
    try {
      const {organisation, body: {amount, currency}} = req;
      const data = await PaystackService.buildDepositData(organisation.id, amount, currency);
      Response.setSuccess(200, 'Deposit data generated.', data);
      return Response.send(res);
    } catch (error) {
      Response.setError(error.status || 400, error.message);
      return Response.send(res);
    }
  }
}

module.exports = WalletController;
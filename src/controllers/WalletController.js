const {
  PaystackService,
  DepositService
} = require('../services');
const {
  Response
} = require('../libs');
const {
  HttpStatusCode,
  SanitizeObject
} = require('../utils');
class WalletController {
  static async paystackDeposit(req, res) {
    try {
      const data = SanitizeObject(req.body, ['amount', 'currency']);
      if(!data.currency) data.currency = 'NGN';
      const organisation = req.organisation;
      organisation.dataValues.email = req.user.email;
      const response = await PaystackService.buildDepositData(organisation, data.amount, data.currency);
      Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'Deposit data generated.', response);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Request failed. Please retry.');
      return Response.send(res);
    }
  }

  static async depositRecords(req, res) {
    try {
      const OrganisationId = req.organisation.id;
      const filter = SanitizeObject(req.query, ['channel', 'service', 'status', 'approved']);
      const records = await DepositService.findOrgDeposits(OrganisationId, filter);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Deposit history.', records);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server Error: Request failed.');
      return Response.send(res);
    }
  }

  static async depositByReference(req, res) {
    try {
      const OrganisationId = req.organisation.id;
      const reference = req.params.reference;
      const record = await DepositService.findOrgDepositByRef(OrganisationId, reference);
      !record && Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Deposit record not found.');
      !!record && Response.setSuccess(HttpStatusCode.STATUS_OK, 'Deposit record found.', record);
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server Error: Request failed.');
      return Response.send(res);
    }
  }

  // static async depositAddress(req, res) {
  //   const asset = req.params.asset;

  // }
}

module.exports = WalletController;
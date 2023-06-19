const {Response} = require('../libs');
const {UtilService, PaystackService} = require('../services');
const {HttpStatusCode, SanitizeObject} = require('../utils');
const {default: axios} = require('axios');
class UtilController {
  static async getCountries(req, res) {
    try {
      const countries = UtilService.allCountryData();
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Countries data.',
        countries
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async getBanks(req, res) {
    try {
      const query = SanitizeObject(req.query, [
        ['perPage', 'page', 'type', 'currency', 'country']
      ]);

      if (!query.country) query.country = 'nigeria';
      if (!query.perPage) query.perPage = 100;
      if (!query.currency) query.currency = 'NGN';

      const banks = await PaystackService.listBanks(query);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Banks', banks);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async resolveAccountNumber(req, res) {
    try {
      const {account_number, bank_code} = SanitizeObject(req.query, [
        'account_number',
        'bank_code'
      ]);
      const response = await PaystackService.resolveAccount(
        account_number,
        bank_code
      );
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Banks', response);
      return Response.send(res);
    } catch (error) {
      Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, error.message);
      return Response.send(res);
    }
  }
  static async getexchangeRates(req, res) {
    const exchange = await axios.get(
      'https://openexchangerates.org/api/latest.json?app_id=da41a176c0874c4498594d728d2aa4ca'
    );
    console.log(exchange.data.rates);
    Response.setSuccess(
      HttpStatusCode.STATUS_OK,
      'Exchange Rate',
      exchange.data.rates
    );
    return Response.send(res);
  }
}

module.exports = UtilController;

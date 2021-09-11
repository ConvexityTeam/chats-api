const { body } = require('express-validator');
const { Response } = require('../libs');
const { HttpStatusCode } = require("../utils");
const { VendorService } = require('../services');
const BaseValidator = require('./BaseValidator');

class VendorValidator extends BaseValidator {
  static createVendorRules() {
    return [
      body('first_name')
        .not().isEmpty()
        .withMessage('Vendor first name is required.'),
      body('last_name')
        .not().isEmpty()
        .withMessage('Vendor last name is required.'),
      body('email')
        .isEmail()
        .withMessage('Email is not well formed.'),
      body('store_name')
       .not().isEmpty()
       .withMessage('Store name is required.'),
      body('location')
        .not().isEmpty()
        .withMessage('Location store is required.'),
      body('address')
        .not().isEmpty()
        .withMessage('Store address is required.'),
      body('phone')
        .not().isEmpty()
        .withMessage('Phone is required.')
        .isMobilePhone()
        .withMessage('Phone number is well formed.')
    ]
  }
  static async VendorStoreExists(req, res, next) {
    try {
      if (!req.body.store_name) {
        next();
        return;
      }
      const existing = await VendorService.searchVendorStore(req.body.store_name);
      if (existing) {
        Response.setError(HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY, 'Vendor Store Exists.');
        return Response.send(res);
      }
      next();
    } catch (error) {
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Error occured. Contact support.');
      return Response.send(res);
    }
  }
}

module.exports = VendorValidator;
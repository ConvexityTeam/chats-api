const {
  body
} = require('express-validator');
const {
  Response
} = require('../libs');
const {
  HttpStatusCode
} = require("../utils");
const {
  VendorService
} = require('../services');
const BaseValidator = require('./BaseValidator');
const ProductValidator = require('./ProductValidator');

class VendorValidator extends BaseValidator {
  static createOrderRules() {
    return [
      body('*.qantity')
      .isInt({
        min: 1,
        allow_leading_zeroes: false
      })
      .withMessage('Product qantity must be numeric and allowed minimum is 1'),
      body('*.product_id')
        .isNumeric()
        .withMessage('Product has invalid ID.')
        .custom(ProductValidator.vendorHasProduct)
    ]
  }
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
        Response.setError(
          HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY,
          'Validation Failed!', {
            store_name: ['Store is registered!']
          }
        );
        return Response.send(res);
      }
      next();
    } catch (error) {
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Error occured. Contact support.');
      return Response.send(res);
    }
  }

  static async VendorExists(req, res, next) {
    try {
      const id = req.params.vendor_id || req.body.vendor_id || req.user.id;
      const vendor = await VendorService.getVendor(id);
      if (vendor) {
        req.vendor = vendor;
        return next();
      }
      Respons.setError(HttpStatusCode.STATUS_FORBIDDEN, 'Invalid vendor account or vendor ID.');
      return Response.send(res);
    } catch (error) {
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Error occured. Contact support.');
      return Response.send(res);
    }
  }
}

module.exports = VendorValidator;
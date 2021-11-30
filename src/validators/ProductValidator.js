const BaseValidator = require('./BaseValidator');
const { Response } = require('../libs');
const { HttpStatusCode, AclRoles } = require('../utils');
const { User, Organisations } = require('../models');
const { VendorService, ProductService } = require('../services')
const { check, body } = require('express-validator');
const { userConst } = require('../constants');


class ProductValidator extends BaseValidator {
  static types = ['product', 'service'];

  static addProductRules =  [
    body()
        .isArray({min: 1})
        .withMessage('Minimum of 1 product is required.'),
        body('*.type')
      .notEmpty()
      .withMessage('Product / Service type is required')
      .isIn(this.types)
      .withMessage(`Type must be any of [${this.types.join(', ')}]`),
      body('*.tag')
      .notEmpty()
      .withMessage('Product/Service tag is required.'),
      body('*.cost')
      .notEmpty()
      .withMessage('Product/Service cost is required.')
      .isFloat()
      .withMessage('Valid Product/Service cost is required.')
      .custom(value => parseFloat(value) > 0)
      .withMessage('Product/Service cost must be positive.'),
      body('*.vendors')
      .isArray({min: 1})
      .withMessage('Minimum of 1 vendor is required.'),
      body('*.vendors.*')
      .isInt()
      .withMessage('Vendor ID must be numeric.')
      .custom(ProductValidator.productVendorsExist),
      this.validate
    ]

  static productVendorsExist(id, {req}) {
      const orgId = req.params.organisation_id || req.organisation.id;
      return new Promise(async  (resolve, reject) => {
        try {
          const vendor = await VendorService.getOrganisationVendor(id, orgId);

          if(!vendor) {
            reject('Organisation vendor not found.');
            return;
          }
          resolve(true);
        } catch (error) {
          reject(`Error checking vendor`);
        }
      });
  }

  static vendorHasProduct(id, {req}) {
      const vendorId = req.params.vendor_id || req.body.vendor_id || req.vendor.id;
      return new Promise(async (resolve, reject) => {
        try {
          const product = await ProductService.findProductByVendorId(id, vendorId);
          if(!product) {
            return reject('Product not found in store.');
          }
          const found_products = {...req.found_products};
          found_products[id] = product.dataValues;
          req.found_products = found_products;
          resolve(true);
        } catch (error) {
          reject('Product not found in store.');
        }
      });
  }
}

module.exports = ProductValidator;
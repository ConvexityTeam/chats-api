const BaseValidator = require('./BaseValidator');
const { Response } = require('../libs');
const { HttpStatusCode } = require('../utils');
const { VendorService, ProductService } = require('../services')
const { body } = require('express-validator');


class ProductValidator extends BaseValidator {
  static types = ['product', 'service'];

  static addProductRules() {
    return [
      body('type')
      .notEmpty()
      .withMessage('Product / Service type is required')
      .isIn(this.types)
      .withMessage(`Type must be any of [${this.types.join(', ')}]`),
      body('tag')
      .notEmpty()
      .withMessage('Product/Service tag is required.'),
      body('cost')
      .notEmpty()
      .withMessage('Product/Service cost is required.')
      .isFloat()
      .withMessage('Valid Product/Service cost is required.')
      .custom(value => parseFloat(value) > 0)
      .withMessage('Product/Service cost must be positive.'),
      body('vendor_id')
      .notEmpty()
      .withMessage('Vendors are required.')
      .customSanitizer(value => Array.isArray(value) ? value : [value])
    ]
  }

  static async productVendorsExist(req, res, next) {
    const ids = req.body.vendor_id;
    const vendors = (await Promise.all(ids.map(id => VendorService.getVendor(id)))).filter(v => !!v);
    if (vendors && vendors.length != ids.length || !vendors) {
      Response.setError(HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY, 'Validation Failed!', {
        vendor_id:
        ['One or more invalid vendor(s) specified. Select only existing vendors.']
      });
      return Response.send(res);
    }
    req.vendors = vendors;
    next();
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
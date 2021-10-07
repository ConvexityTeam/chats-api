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

  static async vendorHasProduct(id, {req}) {
      const vendorId = req.params.vendor_id || req.body.vendor_id || req.vendor.id;

      return ProductService.findProductByVendorId(id, vendorId)
        .then((product) => {
          if(!product) {
            return Promise.reject('Product not found in store.');
          }

          const found_products = {...req.body.found_products};
          found_products[id] = product;

          req.body.found_products = found_products;

          Promise.resolve(product);
        });
  }
}

module.exports = ProductValidator;
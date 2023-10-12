const { body } = require('express-validator');
const BaseValidator = require('./BaseValidator');
const { VendorService } = require('../services');

class ProductValidator extends BaseValidator {
  static types = ['product', 'service', 'item'];

  static addProductRules = [
    body().isArray({ min: 1 }).withMessage('Minimum of 1 product is required.'),
    body('*.type')
      .notEmpty()
      .withMessage('Product / Service/ Item type is required')
      .isIn(this.types)
      .withMessage(`Type must be any of [${this.types.join(', ')}]`),
    body('*.tag')
      .notEmpty()
      .withMessage('Product/Service/Item tag is required.'),
    // body('*.category_id')
    //   .notEmpty()
    //   .withMessage('Category ID is required.')
    //   .isInt()
    //   .withMessage('Category ID must be numeric.'),
    body('*.vendors')
      .isArray({ min: 1 })
      .withMessage('Minimum of 1 vendor is required.'),
    body('*.vendors.*')
      .isInt()
      .withMessage('Vendor ID must be numeric.')
      .custom(ProductValidator.productVendorsExist),
    this.validate,
  ];

  static productVendorsExist(id, { req }) {
    const orgId = req.params.organisation_id || req.organisation.id;
    return new Promise((resolve) => {
      try {
        const vendor = VendorService.getOrganisationVendor(id, orgId);
        if (!vendor) {
          throw new Error('Organisation vendor not found.');
        }
        resolve(true);
      } catch (error) {
        throw new Error('Error checking vendor');
      }
    });
  }
}
module.exports = ProductValidator;

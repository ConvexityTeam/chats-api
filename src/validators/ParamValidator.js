const { param } = require('express-validator');
const BaseValidator = require('./BaseValidator');

class ParamValidator extends BaseValidator {
  static OrganisationId = [
    param('organisation_id')
    .notEmpty()
    .withMessage('organisation ID parameter is required.')
    .isNumeric()
    .withMessage('organisation ID parameter must be numeric'),
    this.validate
  ]

  static VendorId = [
    param('vendor_id')
    .notEmpty()
    .withMessage('Vendor ID parameter is required.')
    .isNumeric()
    .withMessage('Vendor ID parameter must be numeric'),
    this.validate
  ]
}

module.exports = ParamValidator;
const {body} = require('express-validator');
const BaseValidator = require('./BaseValidator');

class KoraPayValidator extends BaseValidator {
  static cardPaymentRules() {
    return [
      body('card.number')
        .notEmpty()
        .withMessage('Card number is required.')
        .isLength({min: 16, max: 16})
        .withMessage('Card number must be 16 digits.')
        .isNumeric()
        .withMessage('Card number is invalid.'),
      body('card.name').notEmpty().withMessage('Name on card is required.'),
      body('card.expiry_month')
        .notEmpty()
        .withMessage('Expiry month is required.')
        .isNumeric()
        .withMessage('Expiry month must be numeric.'),
      body('card.expiry_year')
        .notEmpty()
        .withMessage('Expiry year is required.')
        .isNumeric()
        .withMessage('Expiry year must be numeric.'),
      body('card.cvv')
        .notEmpty()
        .withMessage('CVV is required.')
        .isNumeric()
        .withMessage('CVV must be numeric.')
        .isLength({min: 3, max: 3})
        .withMessage('CVV must be 3 digits.'),
      body('amount')
        .notEmpty()
        .withMessage('Amount is required.')
        .isNumeric()
        .withMessage('Amount must be numeric.')
        .isLength({min: 2})
        .withMessage('Amount must be at least 2 digits.'),
      body('currency')
        .notEmpty()
        .withMessage('Currency is required.')
        .isIn(['NGN', 'USD', 'EUR'])
        .withMessage('Currency must be one of [NGN, USD, EUR]')
    ];
  }
  static authorizePayment() {
    return [
      body('reference')
        .notEmpty()
        .withMessage('Reference is required.')
        .isNumeric()
        .withMessage('Reference must be numeric.')
        .isLength({min: 2})
        .withMessage('Reference must be at least 2 digits.'),
      body('authorization.pin')
        .notEmpty()
        .withMessage('Authorization pin is required.')
        .isNumeric()
        .withMessage('Authorization pin must be numeric.')
        .isLength({min: 4})
        .withMessage('Authorization pin must be 4 digits.')
    ];
  }
}

module.exports = KoraPayValidator;

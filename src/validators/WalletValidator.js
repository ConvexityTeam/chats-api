const {body} = require('express-validator');
const BaseValidator = require('./BaseValidator');

class WalletValidator extends BaseValidator {
  static fiatDepositRules() {
    return [
      body('amount')
        .notEmpty()
        .withMessage('Deposit amount is required. ')
        .isNumeric()
        .withMessage('Only numeric values allowed.')
        .custom(amount => +amount > 0)
        .withMessage(`Deposit amount must be greater than 0.`),
      body('currency')
        .optional()
        .isAlpha()
        .withMessage('Only alphabets allowed.')
        .isUppercase()
        .withMessage('Only uppercase is allowed')
        .isIn(['NGN', 'USD', 'EUR'])
        .withMessage('Currency must be one of [NGN, USD, EUR]')
    ];
  }
}

module.exports = WalletValidator;

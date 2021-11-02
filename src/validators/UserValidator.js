const {
  body,
  check
} = require('express-validator');
const {
  BankAccount
} = require('../models');
const BaseValidator = require('./BaseValidator');

class UserValidator extends BaseValidator {

  static setPinRules() {
    return [
      body('pin')
      .isNumeric()
      .withMessage('PIN value must be numeric.')
      .isLength({
        min: 4,
        max: 4
      })
      .withMessage('PIN must be 4 characters long.')
    ]
  }

  static updatePinRules() {
    return [
      body('old_pin')
      .isNumeric()
      .withMessage('Old PIN value must be numeric.')
      .isLength({
        min: 4,
        max: 4
      })
      .withMessage('Old PIN must be 4 characters long.'),
      body('new_pin')
      .isNumeric()
      .withMessage('New PIN value must be numeric.')
      .isLength({
        min: 4,
        max: 4
      })
      .withMessage('New PIN must be 4 characters long.')

    ]
  }


  static updatePasswordRules() {
    return [
      body('old_password')
      .notEmpty()
      .withMessage('Old password is required.'),
      body('new_password')
      .notEmpty()
      .withMessage('New password is required.')
    ]
  }

  static addAccountValidation = [
    check('account_number')
      .notEmpty()
      .withMessage('Account number is required.')
      .custom((value) => new Promise(async (resolve, reject) => {
        const account = await BankAccount.findOne({ where: { account_number: value } });
        if (account) return reject('Account number already taken.');
        resolve(true);
      })),
      check('bank_name')
      .notEmpty()
      .withMessage('Bank name is required.'),
      this.validate
    ]
  }

  module.exports = UserValidator;
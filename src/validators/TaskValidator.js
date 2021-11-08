const {
  body,
  param
} = require('express-validator');
const BaseValidator = require('./BaseValidator');

class TaskValidator extends BaseValidator {

  static createCashForWorkTaskRule() {
    return [
      body().isArray({ min: 1 }).withMessage('Minimum of 1 task is required.'),
      body('*.name').notEmpty().isString().withMessage('name is required.'),
      body('*.description').notEmpty().isString().withMessage('description is required.'),
      body('*.amount').notEmpty().isNumeric().withMessage('amount is required.')
    ]
  }

  static updateCashForWorkTaskRule() {
    return [
      param('task_id').isNumeric().notEmpty(),
      body('name').isString().withMessage('name must be a valid string.'),
      body('description').isString().withMessage('description name must be a valid string.'),
      body('amount').isNumeric().withMessage('amount name must be a valid amount.')
    ]
  }

}

module.exports = TaskValidator;
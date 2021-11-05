const {
  body,
  param
} = require('express-validator');
const BaseValidator = require('./BaseValidator');

class TaskValidator extends BaseValidator {

  static createCashForWorkTaskRule() {
    return [
      param('campaign_id').isNumeric().notEmpty(),
      body('tasks').isArray(),
      body('tasks.*.name').notEmpty().isString().withMessage('name is required.'),
      body('tasks.*.description').notEmpty().isString().withMessage('description is required.'),
      body('tasks.*.amount').notEmpty().isNumeric().withMessage('amount is required.')
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
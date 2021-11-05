const router = require('express').Router();
const { TaskValidator } = require('../validators');
const { NgoSubAdminAuth, IsOrgMember } = require('../middleware');
const TaskController = require('../controllers/TaskController');

router.route('/:organisation_id/cash_for_work_task/:campaign_id')
	.get(
		NgoSubAdminAuth,
		IsOrgMember,
		TaskController.getCashForWorkTasks
	)
	.post(
		NgoSubAdminAuth,
		IsOrgMember,
		TaskValidator.createCashForWorkTaskRule(),
		TaskValidator.validate,
		TaskController.createCashForWorkTask
	);

router.put('/:organisation_id/:task_id',
	NgoSubAdminAuth,
	IsOrgMember,
	TaskValidator.updateCashForWorkTaskRule(),
	TaskValidator.validate,
	TaskController.updateTask
);

module.exports = router;

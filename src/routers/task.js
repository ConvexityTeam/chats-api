const router = require('express').Router();
const {
	CampaignValidator,
	TaskValidator } = require('../validators');
const { NgoSubAdminAuth, IsOrgMember } = require('../middleware');
const TaskController = require('../controllers/TaskController');

router.route('/:organisation_id/:campaign_id')
	.get(
		NgoSubAdminAuth,
		IsOrgMember,
		CampaignValidator.campaignBelongsToOrganisation,
		TaskController.getCashForWorkTasks
	)
	.post(
		NgoSubAdminAuth,
		IsOrgMember,
		CampaignValidator.campaignBelongsToOrganisation,
		TaskValidator.createCashForWorkTaskRule(),
		TaskValidator.validate,
		TaskController.createCashForWorkTask
	);

router
	.put('/:organisation_id/:campaign_id/:task_id',
		NgoSubAdminAuth,
		IsOrgMember,
		CampaignValidator.campaignBelongsToOrganisation,
		TaskValidator.updateCashForWorkTaskRule(),
		TaskValidator.validate,
		TaskController.updateTask
	);

module.exports = router;

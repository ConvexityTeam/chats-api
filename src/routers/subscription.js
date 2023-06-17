const router = require('express').Router();

const {SuperAdminAuth, IsOrgMember} = require('../middleware');

const {
  OrganisationValidator,
  ParamValidator,
  FileValidator,
  CampaignValidator
} = require('../validators');

const {SubscriptionController} = require('../controllers');

router.post(
  '/create-plan',
  SuperAdminAuth,
  SubscriptionController.createSubscriptions
);
router.put(
  '/update-plan:id',
  SuperAdminAuth,
  SubscriptionController.updateSubscriptions
);
router.get(
  '/plans',
  SuperAdminAuth,
  SubscriptionController.getAllSubscriptions
);
router.delete(
  '/:id',
  SuperAdminAuth,
  SubscriptionController.deleteSubscriptions
);

module.exports = router;

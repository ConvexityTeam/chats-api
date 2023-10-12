const router = require('express').Router();

const { IsOrgMember } = require('../middleware');

const { SubscriptionController } = require('../controllers');

router.post(
  '/buy-plan',
  IsOrgMember,
  SubscriptionController.createSubscriptions,
);
router.put(
  '/update-subscription/:id',
  IsOrgMember,
  SubscriptionController.updateSubscriptions,
);
router.get(
  '/subscriptions',
  IsOrgMember,
  SubscriptionController.getAllSubscriptions,
);
router.delete('/:id', IsOrgMember, SubscriptionController.deleteSubscriptions);

module.exports = router;

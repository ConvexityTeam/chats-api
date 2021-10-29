const router = require('express').Router();
const {
  WebhookController
} = require('../controllers');
const {
  PaystackWebhookGuard
} = require('../middleware');

router.post(
  '/paystack/deposit',
  PaystackWebhookGuard,
  WebhookController.verifyPaystackDeposit
)

module.exports = router;
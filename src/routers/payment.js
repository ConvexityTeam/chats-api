const {KoraPayController} = require('../controllers');
const {KoraPayValidator} = require('../validators');

const router = require('express').Router();

router.post(
  '/card-payment',
  KoraPayValidator.cardPaymentRules(),
  KoraPayValidator.validate,
  KoraPayController.cardPayment
);

module.exports = router;

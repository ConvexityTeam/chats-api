const router = require('express').Router();

const {
  Auth,
  BeneficiaryAuth,
  IsRequestWithValidPin
} = require("../middleware");

const {
  WalletController,
  ProductController,
  OrganisationController,
  CampaignController,
  ComplaintController,
  BeneficiaryController,
  OrderController
} = require('../controllers');

const {
  CommonValidator,
  VendorValidator,
  CampaignValidator,
  OrganisationValidator,
  ProductValidator,
  ComplaintValidator,
  BeneficiaryValidator,
  WalletValidator,
  FileValidator,
  ParamValidator,
  OrderValidator
} = require('../validators');




// Refactord routes
router.route('/:reference')
  .get(
    Auth,
    ParamValidator.Reference,
    OrderController.getOrderByReference
  )

  router.route('/:reference/pay')
    .post(
      BeneficiaryAuth,
      OrderValidator.CompleteOrder,
      IsRequestWithValidPin,
      OrderController.completeOrder
    )


module.exports = router;
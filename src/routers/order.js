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


router.get('/product-purchased-gender', OrderController.productPurchasedByGender)
router.get('/product-purchased-age', OrderController.productPurchasedByAgeGroup)
router.get('/query-product-vendor', OrderController.productPurchased)

// Refactord routes
router.route('/:reference')
  .get(
    Auth,
    ParamValidator.Reference,
    OrderController.getOrderByReference
  )

  router.route('/:reference/pay/:userwallet_id/:campaignwallet_id')
    .post(
      BeneficiaryAuth,
      OrderValidator.CompleteOrder,
      IsRequestWithValidPin,
      OrderController.completeOrder
    )


module.exports = router;
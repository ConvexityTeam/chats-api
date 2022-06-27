const router = require('express').Router();

const {
  Auth,
  BeneficiaryAuth,
  IsRequestWithValidPin,
  VendorAuth
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
router.get('/total_sold_value', OrderController.productPurchased)

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
router.post('/token/confirm-payment/:reference',
VendorAuth,
 OrderController.comfirmsmsTOKEN)

module.exports = router;
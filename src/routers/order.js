const router = require('express').Router();

const {
  Auth,
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
  ParamValidator
} = require('../validators');




// Refactord routes
router.route('/:reference')
  .get(
    Auth,
    ParamValidator.Reference,
    OrderController.getOrderByReference
  )


module.exports = router;
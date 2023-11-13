const {
  GodModeAuth,
  BeneficiaryAuth,
  FieldAgentAuth,
  NgoSubAdminAuth,
  Auth,
  FieldAgentBeneficiaryAuth,
  VendorBeneficiaryAuth
} = require('../middleware');
const {
  AuthController,
  BeneficiaryController,
  CampaignController,
  OrderController
} = require('../controllers');

const {
  CommonValidator,
  BeneficiaryValidator,
  ComplaintValidator,
  CampaignValidator
} = require('../validators');
const router = require('express').Router();

module.exports = router;

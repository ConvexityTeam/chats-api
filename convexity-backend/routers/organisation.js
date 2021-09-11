const router = require('express').Router();

const OrganisationCtrl = require("../controllers/OrganisationController");
const {
  WalletController
} = require('../controllers');
const {
  Auth,
  FieldAgentAuth,
  NgoAdminAuth,
  NgoSubAdminAuth,
  IsOrgMember
} = require("../middleware");
const {
  CommonValidator,
  VendorValidator,
  CampaignValidator,
  OrganisationValidator
} = require('../validators');


router.post("/flutterwave/webhook", OrganisationCtrl.mintToken);
router.post("/flutterwave/webhook2", OrganisationCtrl.mintToken2);
router.post("/register", OrganisationCtrl.register);
router.post("/bantu/webhook", OrganisationCtrl.bantuTransfer);
router.get("/wallets/:organisationId", OrganisationCtrl.getWallets);
router.get("/wallets/main/:organisationId", OrganisationCtrl.getMainWallet);
router.get("/wallets/campaign/:organisationId/:campaignId", OrganisationCtrl.getCampignWallet);
router.post("/member", OrganisationCtrl.addMember);
router.get("/transactions/:organisationId", OrganisationCtrl.fetchTransactions);
router.post("/campaign", OrganisationCtrl.createCampaign);
router.put("/campaign", OrganisationCtrl.updateCampaign);
router.post("/update-profile", OrganisationCtrl.updateProfile);
router.post("/transfer/token", OrganisationCtrl.transferToken);
router.get("/financials/:id", OrganisationCtrl.getFinancials);
router.get("/beneficiaries-summary/:id", OrganisationCtrl.getBeneficiariesFinancials);
router.get("/metric/:id", OrganisationCtrl.getMetric);


// Refactord routes
router.post('/:organisation_id/wallets/paystack-deposit', NgoAdminAuth, IsOrgMember, WalletController.paystackDeposit);

router.route('/:organisation_id/campaigns')
  .get(
    OrganisationValidator.organisationExists,
    OrganisationCtrl.getAvailableOrgCampaigns
  )
  .post(
    NgoSubAdminAuth,
    IsOrgMember,
    CampaignValidator.campaignTitleExists,
    CampaignValidator.createCampaignRules(),
    CampaignValidator.validate,
    OrganisationCtrl.createCampaign
  );

router.route('/:organisation_id/campaigns/all')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    OrganisationCtrl.getAllOrgCampaigns
  );

router.route('/:organisation_id/campaigns/:campaign_id')
  .put(
    NgoAdminAuth,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignValidator.updateCampaignRules(),
    CampaignValidator.validate,
    OrganisationCtrl.updateOrgCampaign
  );


router.route('/:organisation_id/vendors')
  .get(
    FieldAgentAuth,
    IsOrgMember,
    OrganisationCtrl.getOrganisationVendors
  )
  .post(
    FieldAgentAuth,
    IsOrgMember,
    VendorValidator.createVendorRules(),
    VendorValidator.validate,
    VendorValidator.VendorStoreExists,
    CommonValidator.checkEmailNotTaken,
    CommonValidator.checkPhoneNotTaken,
    OrganisationCtrl.createVendor
  )

module.exports = router;
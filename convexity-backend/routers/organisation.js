const router = require('express').Router();

const {
  WalletController,
  ProductController,
  OrganisationController,
  CampaignController
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
  OrganisationValidator,
  ProductValidator
} = require('../validators');

router.post("/flutterwave/webhook", OrganisationController.mintToken);
router.post("/flutterwave/webhook2", OrganisationController.mintToken2);
router.post("/register", OrganisationController.register);
router.post("/bantu/webhook", OrganisationController.bantuTransfer);
router.get("/wallets/:organisationId", OrganisationController.getWallets);
router.get("/wallets/main/:organisationId", OrganisationController.getMainWallet);
router.get("/wallets/campaign/:organisationId/:campaignId", OrganisationController.getCampignWallet);
router.post("/member", OrganisationController.addMember);
router.get("/transactions/:organisationId", OrganisationController.fetchTransactions);
router.post("/campaign", OrganisationController.createCampaign);
router.put("/campaign", OrganisationController.updateCampaign);
router.post("/update-profile", OrganisationController.updateProfile);
router.post("/transfer/token", OrganisationController.transferToken);
router.get("/financials/:id", OrganisationController.getFinancials);
router.get("/beneficiaries-summary/:id", OrganisationController.getBeneficiariesFinancials);
router.get("/metric/:id", OrganisationController.getMetric);


// Refactord routes
router.post('/:organisation_id/wallets/paystack-deposit', NgoAdminAuth, IsOrgMember, WalletController.paystackDeposit);

router.route('/:organisation_id/campaigns')
  .get(
    FieldAgentAuth,
    OrganisationValidator.organisationExists,
    OrganisationController.getAvailableOrgCampaigns
  )
  .post(
    NgoSubAdminAuth,
    IsOrgMember,
    CampaignValidator.campaignTitleExists,
    CampaignValidator.createCampaignRules(),
    CampaignValidator.validate,
    OrganisationController.createCampaign
  );

router.route('/:organisation_id/campaigns/:campaign_id/products')
  .post(
    NgoSubAdminAuth,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    ProductValidator.addProductRules(),
    ProductValidator.validate,
    ProductValidator.productVendorsExist,
    ProductController.addCampaignProduct
  );

router.route('/:organisation_id/campaigns/all')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    OrganisationController.getAllOrgCampaigns
  );

router.route('/:organisation_id/campaigns/:campaign_id')
  .get(
    NgoAdminAuth,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignController.getCampaign
  )
  .put(
    NgoAdminAuth,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignValidator.updateCampaignRules(),
    CampaignValidator.validate,
    OrganisationController.updateOrgCampaign
  );


router.route('/:organisation_id/vendors')
  .get(
    FieldAgentAuth,
    IsOrgMember,
    OrganisationController.getOrganisationVendors
  )
  .post(
    FieldAgentAuth,
    IsOrgMember,
    VendorValidator.createVendorRules(),
    VendorValidator.validate,
    VendorValidator.VendorStoreExists,
    CommonValidator.checkEmailNotTaken,
    CommonValidator.checkPhoneNotTaken,
    OrganisationController.createVendor
  )

module.exports = router;
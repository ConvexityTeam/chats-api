const router = require('express').Router();

const {
  WalletController,
  ProductController,
  OrganisationController,
  CampaignController,
  ComplaintController,
  BeneficiaryController
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
  ProductValidator,
  ComplaintValidator,
  BeneficiaryValidator,
  WalletValidator
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
router.route('/:organisation_id/wallets/paystack-deposit')
  .post(
    NgoSubAdminAuth, 
    IsOrgMember, 
    WalletValidator.fiatDepositRules(),
    WalletValidator.validate,
    WalletController.paystackDeposit
  );

router.route('/:organisation_id/beneficiaries')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    BeneficiaryController.organisationBeneficiaries
  );

router.route('/:organisation_id/beneficiaries/approve')
    .put(
      NgoSubAdminAuth,
      IsOrgMember,
    )


router.route('/:organisation_id/beneficiaries/transactions')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    OrganisationController.getBeneficiariesTransactions
  )

router.route('/:organisation_id/beneficiaries/:beneficiary_id')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    BeneficiaryValidator.BeneficiaryExists,
    BeneficiaryController.getBeneficiary
  )

router.route('/:organisation_id/beneficiaries/:beneficiary_id/transactions')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    BeneficiaryValidator.BeneficiaryExists,
    BeneficiaryController.beneficaryTransactions
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
  );

router.route('/:organisation_id/vendors/summary')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    OrganisationController.getVendorsSummary
  )

router.route('/:organisation_id/vendors/:vendor_id')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    VendorValidator.VendorExists,
    OrganisationController.getVendorDetails
  )

router.route('/:organisation_id/campaigns')
  .get(
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

router.route('/:organisation_id/campaigns/:campaign_id/products')
  .post(
    NgoSubAdminAuth,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    ProductValidator.addProductRules(),
    ProductValidator.validate,
    ProductController.addCampaignProduct
  );

router.route('/:organisation_id/campaigns/:campaign_id/complaints')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    ComplaintController.getCampaignConplaints
  )

router.route('/:organisation_id/campaigns/:campaign_id/complaints/:complaint_id')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    ComplaintController.getCampaignConplaint
  );

router.patch(
  '/:organisation_id/campaigns/:campaign_id/complaints/:complaint_id/resolve',
  NgoSubAdminAuth,
  IsOrgMember,
  CampaignValidator.campaignBelongsToOrganisation,
  ComplaintValidator.complaintBelongsToCampaign,
  ComplaintController.resolveCampaignConplaint
)


module.exports = router;
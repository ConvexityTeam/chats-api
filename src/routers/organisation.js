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
const multer = require('../middleware/multer');
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
router.route('/:organisation_id/profile')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    OrganisationController.getProfile
  )
  .put(
    NgoAdminAuth,
    IsOrgMember,
    OrganisationValidator.profileUpdateRules(),
    OrganisationValidator.validate,
    OrganisationController.completeProfile
  )
router.route('/:organisation_id/logo')
  .post(
    NgoSubAdminAuth,
    IsOrgMember,
    FileValidator.checkLogoFile(),
    OrganisationController.changeOrganisationLogo
  )

router.route('/:organisation_id/wallets/deposits')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    WalletController.depositRecords
  );

router.route('/:organisation_id/wallets/deposits/:reference')
  .get(
    NgoSubAdminAuth,
    IsOrgMember,
    ParamValidator.Reference,
    WalletController.depositByReference
  );

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
    CampaignValidator.campaignBelongsToOrganisation,
    BeneficiaryValidator.IsCampaignBeneficiary,
    OrganisationController.approveCampaignBeneficiary
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

router.route('/:organisation_id/vendors/transactions')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.vendorsTransactions
  );

router.route('/:organisation_id/vendors/summary')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getVendorsSummary
  )

router.route('/:organisation_id/vendors/:vendor_id')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.VendorId,
    VendorValidator.VendorExists,
    OrganisationController.getVendorDetails
  )

router.route('/:organisation_id/campaigns')
  .get(
    ParamValidator.OrganisationId,
    OrganisationValidator.organisationExists,
    OrganisationController.getAvailableOrgCampaigns
  )
  .post(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignTitleExists,
    CampaignValidator.createCampaignRules(),
    CampaignValidator.validate,
    OrganisationController.createCampaign
  );

router.route('/:organisation_id/campaigns/all')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getAllOrgCampaigns
  );

router.route('/:organisation_id/campaigns/:campaign_id')
  .get(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignController.getCampaign
  )
  .put(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignValidator.updateCampaignRules(),
    CampaignValidator.validate,
    OrganisationController.updateOrgCampaign
  )

router.route('/:organisation_id/campaigns/:campaign_id/fund')
  .post(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignController.approveAndFund
  )

router.route('/:organisation_id/campaigns/:campaign_id/vendors')
  .post(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    VendorValidator.approveCampaignVendor,
    OrganisationController.approveCampaignVendor
  )

router.route('/:organisation_id/campaigns/:campaign_id/products')
  .post(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    ProductValidator.addProductRules,
    ProductController.addCampaignProduct
  );

router.route('/:organisation_id/campaigns/:campaign_id/complaints')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    ComplaintController.getCampaignConplaints
  )

router.route('/:organisation_id/campaigns/:campaign_id/complaints/:complaint_id')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    ComplaintController.getCampaignConplaint
  );

router.patch(
  '/:organisation_id/campaigns/:campaign_id/complaints/:complaint_id/resolve',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  CampaignValidator.campaignBelongsToOrganisation,
  ComplaintValidator.complaintBelongsToCampaign,
  ComplaintController.resolveCampaignConplaint
)


module.exports = router;
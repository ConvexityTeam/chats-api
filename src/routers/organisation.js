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


router.get('/campaigns/transaction', 
NgoSubAdminAuth,
    OrganisationController.record)
    router.post('/beneficiaries/sms-token',
    CampaignController.sendSMStoken)

router.get('/campaign/:campaign_id/balance/:organisation_id', 
NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignIdOptional,
    WalletController.CampaignBalance)

router.route('/:organisation_id/wallets/transactions/:reference?')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.ReferenceOptional,
    WalletController.getOrgnaisationTransaction
  )

router.route('/:organisation_id/wallets/campaigns/:campaign_id?')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignIdOptional,
    WalletController.getOrganisationCampaignWallet
  );

router.route('/:organisation_id/wallets/paystack-deposit')
  .post(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    WalletValidator.fiatDepositRules(),
    WalletValidator.validate,
    WalletController.paystackDeposit
  );
router.route('/:organisation_id/wallets/:wallet_id?')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.WalletIdOptional,
    WalletController.getOrganisationWallet
  );

// Refactord routes
router.route('/:organisation_id/profile')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getProfile
  )
  .put(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationValidator.profileUpdateRules(),
    OrganisationValidator.validate,
    OrganisationController.completeProfile
  )
router.route('/:organisation_id/logo')
  .post(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    FileValidator.checkLogoFile(),
    OrganisationController.changeOrganisationLogo
  )

router.route('/:organisation_id/beneficiaries')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getOrganisationBeneficiaries
  );


router.route('/:organisation_id/beneficiaries/transactions')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getBeneficiariesTransactions
  )

router.route('/:organisation_id/beneficiaries/:beneficiary_id')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    BeneficiaryValidator.BeneficiaryExists,
    OrganisationController.getOrganisationBeneficiaryDetails
  )

router.route('/:organisation_id/vendors')
  .get(
    FieldAgentAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getOrganisationVendors
  )
  .post(
    FieldAgentAuth,
    ParamValidator.OrganisationId,
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

  router.route('/:organisation_id/cash4works')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    OrganisationController.getAllOrgCash4W
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
  router.route('/:organisation_id/task/:campaign_id/fund_beneficiary')
  .post(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    CampaignValidator.campaignBelongsToOrganisation,
    CampaignController.fundApprovedBeneficiary
  )
router.route('/:token_type/tokens/:page')
  .get(
    NgoAdminAuth,
    CampaignController.campaignTokens
  )

  
router.route('/:organisation_id/campaigns/:campaign_id/vendors')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    OrganisationController.getCampaignVendors
  )
  .post(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    VendorValidator.approveCampaignVendor,
    OrganisationController.approveCampaignVendor
  )

router.route('/:organisation_id/campaigns/:campaign_id/beneficiaries')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    OrganisationController.getCampaignBeneficiaries
  )
  .put(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    BeneficiaryValidator.ApprovedBeneficiary,
    BeneficiaryValidator.IsCampaignBeneficiary,
    OrganisationController.updaeCampaignBeneficiary
  );

router.route('/:organisation_id/campaigns/:campaign_id/beneficiaries/approve')
  .put(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    OrganisationController.approvedAllbeneficiaries
  )
router.route('/products/:vendor_id')
  .get(

    OrganisationController.getProductVendors
  )

router.route('/:organisation_id/campaigns/:campaign_id/products')
  .get(
    // NgoSubAdminAuth,
    // ParamValidator.OrganisationId,
    // IsOrgMember,
    // ParamValidator.CampaignId,
    // CampaignValidator.campaignBelongsToOrganisation,
    OrganisationController.getCampaignProducts
  )
  .post(
    NgoAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    ProductValidator.addProductRules,
    OrganisationController.addCampaignProduct
  );
  router.post('/product/:organisation_id/:campaign_id/destroy',
  NgoAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignId,
  CampaignValidator.campaignBelongsToOrganisation,
   OrganisationController.DeleteCampaignProduct
   )

   router.post('/product/:organisation_id/:campaign_id/update',
  NgoAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignId,
  CampaignValidator.campaignBelongsToOrganisation,
   OrganisationController.UpdateCampaignProduct
   )

router.route('/:organisation_id/campaigns/:campaign_id/complaints')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    ComplaintController.getCampaignConplaints
  )

router.route('/:organisation_id/campaigns/:campaign_id/complaints/:complaint_id')
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    ParamValidator.CampaignId,
    CampaignValidator.campaignBelongsToOrganisation,
    ComplaintController.getCampaignConplaint
  );

router.patch(
  '/:organisation_id/campaigns/:campaign_id/complaints/:complaint_id/resolve',
  NgoSubAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  ParamValidator.CampaignId,
  CampaignValidator.campaignBelongsToOrganisation,
  ComplaintValidator.complaintBelongsToCampaign,
  ComplaintController.resolveCampaignConplaint
)


module.exports = router;
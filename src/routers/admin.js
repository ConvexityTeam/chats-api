const router = require('express').Router();

const {SuperAdminAuth, IsOrgMember} = require('../middleware');

const {
  OrganisationValidator,
  ParamValidator,
  FileValidator,
} = require('../validators');
const AdminController = require('../controllers/AdminController');
const { AuthController, 
  NgoController, VendorController } = require('../controllers')

router.put('/update-user', AdminController.updateUserStatus);
// router.post("/register", AuthCtrl.createUser);
// router.post("/self-registration", AuthCtrl.normalRegistration);
// router.post("/ngo-register", AuthCtrl.createAdminUser);
// router.post("/register/special-case", AuthCtrl.specialCaseRegistration);
router.post('/update-profile', AuthController.updateProfile);
router.get('/user-detail/:id', AuthController.userDetails);
router.put('/update/campaign/status', AdminController.updateCampaignStatus);
router.post(
  '/nin-verification/:userprofile_id',
  //ParamValidator.OrganisationId,
  //IsOrgMember,
  FileValidator.checkProfileSelfie(),
  AdminController.verifyAccount,
);




router.post('/auth/login', AuthController.signInAdmin);
router.get('/ngos', SuperAdminAuth, AdminController.getAllNGO); 
router.get('/ngo/:organisation_id', SuperAdminAuth, AdminController.getAnNGO);
router.get('/ngos/:organisation_id/', SuperAdminAuth, AdminController.getNGODisbursedAndBeneficiaryTotal);
router.get('/vendors', SuperAdminAuth, AdminController.getAllVendors);
router.get('/vendors/:vendor_id/', SuperAdminAuth, AdminController.getVendorCampaignAndAmountTotal);
router.get('/beneficiaries', SuperAdminAuth, AdminController.getAllBeneficiaries);
router.get('/beneficiaries/:beneficiary_id', SuperAdminAuth, AdminController.getBeneficiaryAmountAndCampaignsTotal);
router.get('/campaigns', SuperAdminAuth, AdminController.getAllCampaigns);
router.get('/donors', SuperAdminAuth, AdminController.getAllDonors);
router.get('/donors/:donor_id/campaigns', SuperAdminAuth, AdminController.getDonorCampaignCount);






module.exports = router;

const router = require('express').Router();

const {SuperAdminAuth, IsOrgMember} = require('../middleware');

const {
  OrganisationValidator,
  ParamValidator,
  FileValidator,
} = require('../validators');
const AdminController = require('../controllers/AdminController');
const { AuthController, NgoController } = require('../controllers')

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
router.get('/ngos', SuperAdminAuth, NgoController.getAllNGO);

module.exports = router;

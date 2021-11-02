const {
  GodModeAuth,
  BeneficiaryAuth
} = require("../middleware");
const {
  AuthController,
  BeneficiaryController,
  CampaignController
} = require('../controllers');

const {
  CommonValidator,
  BeneficiaryValidator,
  ComplaintValidator,
  CampaignValidator
} = require("../validators");
const router = require("express").Router();

router.get('/', BeneficiaryController.getAllUsers);
router.delete('/:id', BeneficiaryController.deleteUser);
router.post('/add-account', BeneficiaryController.addAccount);
router.post('/register', BeneficiaryController.createUser);
router.post('/complaint', BeneficiaryController.createComplaint)
router.put('/complaint/resolve', BeneficiaryController.resolveComplaint)
router.get('/complaints/:beneficiary', BeneficiaryController.getComplaintsByBeneficiary)
router.get('/user/:beneficiary', BeneficiaryController.getBeneficiaryUserWallet)
router.get('/user-details/:beneficiary', BeneficiaryController.getBeneficiaryUser)

router.route('/profile')
  .get(
    BeneficiaryAuth,
    BeneficiaryController.getProfile
  );

router.route('/:id')
  .delete(
    GodModeAuth,
    BeneficiaryController.deleteUser
  )
  // .put(
  //   BeneficiaryAuth,
  //   BeneficiaryController.updatedUser
  // );

// Refactored
router.post(
  '/auth/register',
  BeneficiaryValidator.validateSelfRegister,
  CommonValidator.checkEmailNotTaken,
  CommonValidator.checkPhoneNotTaken,
  AuthController.beneficiaryRegisterSelf
);

router.route('/campaigns')
  .get(
    BeneficiaryAuth,
    CampaignController.getBeneficiaryCampaigns
  )

// router.route('/transactions')
//   .get(
//     BeneficiaryAuth,
//     CampaignController.getBeneficiaryCampaigns
//   );

router.post(
  '/campaigns/:campaign_id/join',
  BeneficiaryAuth,
  BeneficiaryValidator.NotCampaignBeneficiary,
  CampaignController.addBeneficiary
)

router.put(
  '/campaigns/:campaign_id/leave',
  BeneficiaryAuth,
  BeneficiaryValidator.IsCampaignBeneficiary,
  CampaignController.removeBeneficiary
)

router.route('/campaigns/:campaign_id/complaints')
  .get(
    BeneficiaryAuth,
    BeneficiaryValidator.IsCampaignBeneficiary,
    CampaignController.getBeneficiaryCampaignComplaint
  )
  .post(
    BeneficiaryAuth,
    BeneficiaryValidator.IsCampaignBeneficiary,
    ComplaintValidator.addComplaintRules(),
    ComplaintValidator.validate,
    CampaignController.addBeneficiaryComplaint
  )

module.exports = router;
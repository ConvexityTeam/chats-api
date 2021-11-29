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


router.get('/by_gender/:gender', BeneficiaryController.beneficiariesByGender);
//not yet implemented
router.get('/by_age_group', BeneficiaryController.beneficiariesByAgeGroup);
router.get('/by_location/:location', BeneficiaryController.beneficiariesByLocation);
router.get('/by_marital_status/:marital_status', BeneficiaryController.beneficiariesByMaritalStatus);

router.get('/total_balance', BeneficiaryController.beneficiariesTotalBalance);


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

router.get(
  '/wallets',
  BeneficiaryAuth,
  BeneficiaryController.getWallets
)

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
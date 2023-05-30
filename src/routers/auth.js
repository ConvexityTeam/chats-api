const router = require('express').Router();

const {
  Auth,
  NgoAdminAuth,
  IsOrgMember,
  IsRecaptchaVerified
} = require('../middleware'); //Auhorization middleware
const {AuthController, BeneficiaryController} = require('../controllers');
const {
  AuthValidator,
  CampaignValidator,
  ParamValidator,
  FileValidator
} = require('../validators');

// router.use(e2e);

router.post(
  '/:campaignId/confirm-campaign-invite/:token',
  AuthController.confirmInvite
);

router.post(
  '/:organisation_id/invite/:campaign_id',
  NgoAdminAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  CampaignValidator.campaignBelongsToOrganisation,
  AuthController.sendInvite
);
router.post('/donor-register', AuthController.createDonorAccount);
router.post('/register', AuthController.createBeneficiary);
router.post(
  '/self-registration',
  FileValidator.checkProfilePic(),
  AuthController.beneficiaryRegisterSelf
);
router.post('/ngo-register',AuthController.createNgoAccount);
router.post('/verify-email/',AuthController.createNgoAccount);

router.post('/register/special-case', AuthController.sCaseCreateBeneficiary);
router.post('/nin-verification', AuthController.verifyNin);
router.post('/update-profile', Auth, AuthController.updateProfile);
router.get('/user-detail/:id', Auth, AuthController.userDetails);

// Refactored
router.post('/login', AuthController.signIn);
router.post('/donor-login', AuthController.donorSignIn);
router.post('/field-login', AuthController.signInField);
router.post('/beneficiary-login', AuthController.signInBeneficiary);
router.post('/ngo-login', AuthController.signInNGO);
router.get('/2fa/init', Auth, AuthController.setTwoFactorSecret);
router.post('/2fa/enable', Auth, AuthController.enableTwoFactorAuth);
router.post('/2fa/disable', Auth, AuthController.disableTwoFactorAuth);
router.post('/2fa/toggle', Auth, AuthController.toggleTwoFactorAuth);
router.post('/2fa/state2fa', Auth, AuthController.state2fa);

router
  .route('/password/reset')
  .post(
    AuthValidator.requestPasswordResetRules(),
    AuthValidator.validate,
    AuthValidator.canResetPassword,
    AuthController.requestPasswordReset
  )
  .put(
    AuthValidator.resetPasswordRules(),
    AuthValidator.validate,
    AuthValidator.checkResetPasswordToken,
    AuthController.resetPassword
  );

module.exports = router;

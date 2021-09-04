const router = require('express').Router();

const { AuthController, NgoController} = require('../controllers');
const { FieldAgentAuth, NgoAdminAuth, IsOrgMember } = require('../middleware');
const { NgoValidator, CommonValidator } = require('../validators');

router.get('/', NgoController.getAllNGO);
router.get('/:id', NgoController.getOneNGO);

// auth/register
router.post('/auth/onboard', AuthController.createNgoAccount);

// admin/create - email
router.route(`/:organisation_id/members`)
  .post(
    NgoAdminAuth, 
    IsOrgMember, 
    NgoValidator.createMemberRules(),
    NgoValidator.validate,
    CommonValidator.checkEmailNotTaken,
    CommonValidator.checkPhoneNotTaken,
    NgoController.createAdminMember
  );

// sub-admin/reset-password

// vendors/create - generate vendor and password
router.post('/vendors/create', FieldAgentAuth, IsOrgMember, NgoController.createVendor)
// vendors/deactivate'


router.post('/beneficiaries/register', FieldAgentAuth, IsOrgMember, AuthController.createBeneficiary)
router.post('/beneficiaries/register-special-case', FieldAgentAuth, IsOrgMember, AuthController.sCaseCreateBeneficiary)

// beneficiaries/register
// beneficiaries/register-special-case

// organisation


module.exports = router;
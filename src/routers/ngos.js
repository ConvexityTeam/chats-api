

const {
  AuthController,
  NgoController,
  OrganisationController
} = require('../controllers');
const {
  FieldAgentAuth,
  NgoAdminAuth,
  NgoSubAdminAuth,
  IsOrgMember
} = require('../middleware');
const {
  NgoValidator,
  CommonValidator,
  VendorValidator,
  ParamValidator
} = require('../validators');
const router = require('express').Router();

router.get('/', NgoController.getAllNGO);
router.get('/:id', NgoController.getOneNGO);

// auth/register
router.post('/auth/onboard', AuthController.createNgoAccount);

// admin/create - email
router.route(`/:organisation_id/members`)
  .get(
    NgoSubAdminAuth,
    ParamValidator.OrganisationId,
    IsOrgMember,
    NgoController.members
  )
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
router.post(
  '/vendors/create',
  FieldAgentAuth,
  ParamValidator.OrganisationId,
  IsOrgMember,
  VendorValidator.createVendorRules(),
  VendorValidator.validate,
  VendorValidator.VendorStoreExists,
  OrganisationController.createVendor
)
// vendors/deactivate'


router.post('/beneficiaries/register', FieldAgentAuth, IsOrgMember, AuthController.createBeneficiary)
router.post('/beneficiaries/register-special-case', FieldAgentAuth, IsOrgMember, AuthController.sCaseCreateBeneficiary)



module.exports = router;
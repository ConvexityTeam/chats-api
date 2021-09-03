const router = require('express').Router();

const {AuthController, NgoController} = require('../controllers');
const { NgoSubAdminAuth, FieldAgentAuth, NgoAdminAuth, IsOrgMember } = require('../middleware');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);

router.get('/', NgoController.getAllNGO);
router.get('/:id', NgoController.getOneNGO);

// router.post('/', auth, NgosController.addUser);
// router.put('/:id', auth, NgosController.updatedUser);
// router.delete('/:id', auth, NgosController.deleteUser);

// auth/register
router.post('/auth/onboard', AuthController.createNgoAccount);

// agents/create - email
router.post('/agents/create', NgoSubAdminAuth, IsOrgMember, NgoController.createFieldAgent);
// agents/deactivate 
// agents/reset-password

// sub-admin/create - email
router.post('/sub-admin/create', NgoAdminAuth, IsOrgMember, NgoController.createSubAdmin);
// sub-admin/deactivate 
// sub-admin/reset-password

// admin/create - email
router.post('/admin/create', NgoAdminAuth, IsOrgMember, NgoController.createAdmin);
// admin/deactivate 
// admin/reset-password

// vendors/create - generate vendor and password
router.post('/vendors/create', FieldAgentAuth, IsOrgMember, NgoController.createVendor)
// vendors/deactivate'


router.post('/beneficiaries/register', FieldAgentAuth, IsOrgMember, AuthController.createBeneficiary)
router.post('/beneficiaries/register-special-case', FieldAgentAuth, IsOrgMember, AuthController.sCaseCreateBeneficiary)

// beneficiaries/register
// beneficiaries/register-special-case

// organisation


module.exports = router;
const router = require("express").Router();
const {AuthController, BeneficiaryController} = require('../controllers');
const { CommonValidator, BeneficiaryValidator } = require("../validators");

router.get('/', BeneficiaryController.getAllUsers);
router.put('/:id', BeneficiaryController.updatedUser);
router.delete('/:id', BeneficiaryController.deleteUser);
router.post('/add-account', BeneficiaryController.addAccount);
router.post('/register', BeneficiaryController.createUser);
router.post('/complaint', BeneficiaryController.createComplaint)
router.put('/complaint/resolve', BeneficiaryController.resolveComplaint)
router.get('/complaints/:beneficiary', BeneficiaryController.getComplaintsByBeneficiary)
router.get('/user/:beneficiary', BeneficiaryController.getBeneficiaryUserWallet)
router.get('/user-details/:beneficiary', BeneficiaryController.getBeneficiaryUser)

// Refactored
router.post(
  '/auth/register', 
  BeneficiaryValidator.validateSelfRegister,
  CommonValidator.checkEmailNotTaken,
  CommonValidator.checkPhoneNotTaken,
  AuthController.beneficiaryRegisterSelf
);

module.exports = router;

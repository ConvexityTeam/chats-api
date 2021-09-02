const express = require('express');
const router = express.Router();
const {AuthController, BeneficiaryController} = require('../controllers');

const { BeneficiaryAuth } = require('../middleware/auth');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
router.use(BeneficiaryAuth);

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

// auth/register
router.post('/auth/register', AuthController.beneficiaryRegisterSelf);

module.exports = router;

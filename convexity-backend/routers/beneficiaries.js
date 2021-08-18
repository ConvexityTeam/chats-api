const express = require('express');
const router = express.Router();
const BeneficiariesController = require('../controllers/BeneficiariesController');
const { BeneficiaryAuth } = require('../middleware/main-auth');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
router.use(BeneficiaryAuth);

router.get('/', BeneficiariesController.getAllUsers);
router.put('/:id', BeneficiariesController.updatedUser);
router.delete('/:id', BeneficiariesController.deleteUser);
router.post('/add-account', BeneficiariesController.addAccount);
router.post('/register', BeneficiariesController.createUser);
router.post('/complaint', BeneficiariesController.createComplaint)
router.put('/complaint/resolve', BeneficiariesController.resolveComplaint)
router.get('/complaints/:beneficiary', BeneficiariesController.getComplaintsByBeneficiary)
router.get('/user/:beneficiary', BeneficiariesController.getBeneficiaryUserWallet)
router.get('/user-details/:beneficiary', BeneficiariesController.getBeneficiaryUser)

module.exports = router;

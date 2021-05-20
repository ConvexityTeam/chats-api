const express = require('express');
const router = express.Router();
const BeneficiariesController = require('../controllers/BeneficiariesController');
const auth = require('../middleware/main-auth');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
router.use(auth);

router.get('/', BeneficiariesController.getAllUsers);
router.post('/register', BeneficiariesController.createUser);
router.put('/:id', BeneficiariesController.updatedUser);
router.delete('/:id', BeneficiariesController.deleteUser);
router.post('/complaint', BeneficiariesController.createComplaint)
router.put('/complaint/resolve', BeneficiariesController.resolveComplaint)
router.get('/complaints/:beneficiary', BeneficiariesController.getComplaintsByBeneficiary)
router.get('/user/:beneficiary', BeneficiariesController.getBeneficiaryUserWallet)
router.get('/user-details/:beneficiary', BeneficiariesController.getBeneficiaryUser)

module.exports = router;

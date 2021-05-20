const express = require("express");
var router = express.Router();
const OrganisationCtrl = require('../controllers/OrganisationController');
const auth = require('../middleware/main-auth');
const memberAuth = require('../middleware/isMember');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
router.post('/change-wallet-balance', OrganisationCtrl.editBalance);
router.post('/flutterwave/webhook', OrganisationCtrl.mintToken);
router.use(auth)
router.post('/register', OrganisationCtrl.register);
router.use(memberAuth)
router.post('/member', OrganisationCtrl.addMember);
router.post('/campaign', OrganisationCtrl.createCampaign);
router.post('/update-profile', OrganisationCtrl.updateProfile);
router.get('/financials/:id', OrganisationCtrl.getFinancials);
router.get('/beneficiaries-summary/:id', OrganisationCtrl.getBeneficiariesFinancials);
router.get('/metric/:id', OrganisationCtrl.getMetric);
module.exports = router;

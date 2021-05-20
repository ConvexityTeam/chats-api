const express = require('express');
const router = express.Router();
const CashForWorkController = require('../controllers/CashForWorkController');
const auth = require('../middleware/org-auth');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);

router.get('/', auth, CashForWorkController.getAllOurCampaigns);
router.get('/all', CashForWorkController.getAllCampaigns);
router.post('/', auth, CashForWorkController.addCampaign);
router.post('/onboard-beneficiaries/:campaignId', auth, CashForWorkController.beneficiariesToCampaign);
router.post('/fund-beneficiaries-wallets/:CampaignId', auth, CashForWorkController.fundWallets);
router.post('/task-new/:campaignId', auth, CashForWorkController.newTask);//for creating new cash for work
router.get('/:id', auth, CashForWorkController.getACampaign);
router.put('/:id', auth, CashForWorkController.updatedCampaign);
router.delete('/:id', auth, CashForWorkController.deleteCampaign);

module.exports = router;
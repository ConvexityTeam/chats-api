const express = require('express');
const router = express.Router();
const CampaignsController = require('../controllers/CampaignsController');
const auth = require('../middleware/main-auth');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);

router.get('/organisation/:id', auth, CampaignsController.getAllOurCampaigns);
router.get('/all', CampaignsController.getAllCampaigns);
router.post('/', auth, CampaignsController.addCampaign);
router.post('/onboard-beneficiaries/:campaignId', auth, CampaignsController.beneficiariesToCampaign);
// router.post('/fund-beneficiaries-wallets/:CampaignId', CampaignsController.fundWallets);
router.post('/fund-beneficiaries-wallets', auth, CampaignsController.fundWallets);
router.get('/:id', auth, CampaignsController.getACampaign);
router.put('/:id', auth, CampaignsController.updatedCampaign);
router.delete('/:id', auth, CampaignsController.deleteCampaign);
router.get('/complaints/:campaignId', auth, CampaignsController.complaints)

module.exports = router;

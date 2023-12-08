const router = require('express').Router();
const {CampaignController} = require('../controllers');
const {Auth, BeneficiaryAuth, FieldAgentAuth} = require('../middleware');

router.route('/').get(Auth, CampaignController.getAllCampaigns);
router
  .route('/beneficiary')
  .get(BeneficiaryAuth, CampaignController.getAllBeneficiaryCampaigns);
router.post(
  '/field-agent/',
  FieldAgentAuth,
  CampaignController.getFieldAgentCampaigns
);

router.get('/:id', Auth, CampaignController.getACampaign);
router.put('/:id', Auth, CampaignController.updatedCampaign);
router.post('/:id', Auth, CampaignController.deleteCampaign);
// router.post("/fund-beneficiaries-wallets", Auth, CampaignController.fundWallets);
router.post(
  '/onboard-beneficiaries/:campaignId',
  Auth,
  CampaignController.beneficiariesToCampaign
);
router.get('/complaints/:campaignId', Auth, CampaignController.complaints);

module.exports = router;

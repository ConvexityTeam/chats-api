const router = require('express').Router();

const {
  Auth,
} = require('../middleware'); // Auhorization middleware

// const {AuthController, ImpactReportController} = require('../controllers');
// const {
// } = require('../validators');
const { ImpactReportController } = require('../controllers');

router.post('/create-report/', Auth, ImpactReportController.createReport);

router.get('/all-reports', Auth, ImpactReportController.getAllReport);
router.get(
  '/reports/:campaignId',
  Auth,
  ImpactReportController.getReportByCampaignId,
);

module.exports = router;

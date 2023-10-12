const router = require('express').Router();

const {
  ProductController,
} = require('../controllers');

const {
  NgoSubAdminAuth,
} = require('../middleware');
const {
  ParamValidator,
} = require('../validators');

router.get(
  '/:productId/product/:campaign_id',
  NgoSubAdminAuth,
  ParamValidator.CampaignId,
  ParamValidator.ProductId,
  ProductController.getCampaignProduct,
);

module.exports = router;

const router = require('express').Router();

const { MarketController } = require('../controllers');
// const { } = require('../middleware');
// const {

// } = require('../validators');

router.get('/', MarketController.getAllProductPurchasedByGender);

module.exports = router;

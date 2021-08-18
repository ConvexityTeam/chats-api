const express = require('express');
var router = express.Router();
const VendorsController = require('../controllers/VendorsController');

const {VendorAuth} = require('../middleware/main-auth');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
// users endpoint
router.use(VendorAuth)
router.get('/', VendorsController.getAllVendors);
router.get('/:id', VendorsController.getAVendor);
router.post('/add-account', VendorsController.addAccount)
router.get('/stores/all', VendorsController.getAllStores)
router.get('/store/:id', VendorsController.getVendorStore)
router.get('/accounts/all', VendorsController.getAccounts)
router.get('/products/all', VendorsController.getAllProducts)
router.post('/product', VendorsController.addProduct)
router.get('/products/single/:id', VendorsController.singleProduct)
router.get('/products/value', VendorsController.getProductsValue)
router.get('/products/sold/value', VendorsController.getSoldProductValue)
router.get('/store/products/:storeId', VendorsController.getProductByStore)
router.get('/summary/:id', VendorsController.getSummary)
module.exports = router;

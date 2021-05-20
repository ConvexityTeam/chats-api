const express = require('express');
var router = express.Router();
const VendorsController = require('../controllers/VendorsController');

const auth = require('../middleware/main-auth');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
// users endpoint
router.get('/', auth, VendorsController.getAllVendors);
router.get('/:id', auth, VendorsController.getAVendor);
router.post('/add-account', auth, VendorsController.addAccount)
router.get('/stores/all', auth, VendorsController.getAllStores)
router.get('/store/:id', auth, VendorsController.getVendorStore)
router.get('/accounts/all', auth, VendorsController.getAccounts)
router.get('/products/all', auth, VendorsController.getAllProducts)
router.post('/product', auth, VendorsController.addProduct)
router.get('/products/single/:id', auth, VendorsController.singleProduct)
router.get('/products/value', auth, VendorsController.getProductsValue)
router.get('/products/sold/value', auth, VendorsController.getSoldProductValue)
router.get('/store/products/:storeId', auth, VendorsController.getProductByStore)
router.get('/summary/:id', auth, VendorsController.getSummary)
module.exports = router;

const express = require('express');
var router = express.Router();
const { VendorController, AuthController } = require('../controllers');

const {VendorAuth} = require('../middleware/auth');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
// users endpoint
// router.use(VendorAuth)

router.get('/', VendorController.getAllVendors);
router.get('/:id', VendorController.getAVendor);
router.post('/add-account', VendorController.addAccount)
router.get('/stores/all', VendorController.getAllStores)
router.get('/store/:id', VendorController.getVendorStore)
router.get('/accounts/all', VendorController.getAccounts)
router.get('/products/all', VendorController.getAllProducts)
router.post('/product', VendorController.addProduct)
router.get('/products/single/:id', VendorController.singleProduct)
router.get('/products/value', VendorController.getProductsValue)
router.get('/products/sold/value', VendorController.getSoldProductValue)
router.get('/store/products/:storeId', VendorController.getProductByStore)
router.get('/summary/:id', VendorController.getSummary);


// auth/login - vendor id and password
router.post('/auth/login', AuthController.signInVendor);
module.exports = router;

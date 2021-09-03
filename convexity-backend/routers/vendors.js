const router = require('express').Router();

const { VendorController, AuthController } = require('../controllers');


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
// router.post('/auth/password/init-reset')
// router.post('/auth/password/reset)

module.exports = router;

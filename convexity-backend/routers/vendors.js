const router = require('express').Router();

const { VendorController, AuthController } = require('../controllers');
const { Auth, VendorAuth } = require('../middleware');


router.get('/', VendorController.getAllVendors);
router.get('/me', VendorAuth, VendorController.getVendor);
router.get('/:id', Auth, VendorController.getVendor);
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


router.post('/auth/login', AuthController.signInVendor);
// router.get('/products')
// router.get('/orders');
// router.get('/orders/:order_id');



module.exports = router;

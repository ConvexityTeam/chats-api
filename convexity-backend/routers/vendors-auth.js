const express = require('express');
var router = express.Router();
const AuthCtrl = require('../controllers/VendorsAuthController');
const { VendorAuth } = require('../middleware/main-auth'); //Auhorization middleware
const e2e = require('../middleware/e2e'); //End2End Encryption middleware

router.use(e2e);
//users endpoint
router.post('/register', AuthCtrl.createUser);
router.post('/login', AuthCtrl.signIn);
router.post('/reset-password', AuthCtrl.resetPassword);
router.post('/update-password', VendorAuth, AuthCtrl.updatePassword);
router.post('/update-profile', VendorAuth, AuthCtrl.updateProfile);
router.get('/user-detail/:id', VendorAuth, AuthCtrl.userDetails);

module.exports = router;
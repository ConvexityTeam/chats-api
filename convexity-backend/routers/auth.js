const express = require('express');
var router = express.Router();
const AuthCtrl = require('../controllers/AuthController');
const auth = require('../middleware/auth'); //Auhorization middleware
const multer = require('../middleware/multer-config');//for uploading of profile picture and fingerprint
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
//users endpoint
router.post('/register', AuthCtrl.createUser);
router.post('/self-registration', AuthCtrl.normalRegistration);
router.post('/ngo-register', AuthCtrl.createAdminUser);
router.post('/login', AuthCtrl.signIn);
router.post('/register/special-case', AuthCtrl.specialCaseRegistration);
router.post('/update-profile', auth, AuthCtrl.updateProfile);
router.get('/user-detail/:id', auth, AuthCtrl.userDetails);
module.exports = router;

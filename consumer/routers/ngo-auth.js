const express = require('express');
var router = express.Router();
const NgoAuthCtrl = require('../controllers/NgoAuthController');
// const auth = require('../middleware/auth'); //Auhorization middleware
const auth = require('../middleware/org-auth');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
//users endpoint
router.post('/register', NgoAuthCtrl.createUser);
router.post('/login', NgoAuthCtrl.signIn);
router.post('/reset-password', NgoAuthCtrl.resetPassword);
router.post('/update-password', auth, NgoAuthCtrl.updatePassword);
router.post('/update-profile', auth, NgoAuthCtrl.updateProfile);
router.get('/user-detail/:id', auth, NgoAuthCtrl.userDetails);
router.get('/dashboard', auth, NgoAuthCtrl.dashboard);

module.exports = router;
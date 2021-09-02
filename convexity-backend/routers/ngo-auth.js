const express = require('express');
var router = express.Router();
const NgoAuthCtrl = require('../controllers/NgoAuthController');
// const auth = require('../middleware/auth'); //Auhorization middleware
const {NgoAuth} = require('../middleware/auth');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
//users endpoint
router.post('/register', NgoAuthCtrl.createUser);
router.post('/login', NgoAuthCtrl.signIn);
router.post('/reset-password', NgoAuthCtrl.resetPassword);
router.post('/update-password', NgoAuth, NgoAuthCtrl.updatePassword);
router.post('/update-profile', NgoAuth, NgoAuthCtrl.updateProfile);
router.get('/user-detail/:id', NgoAuth, NgoAuthCtrl.userDetails);
router.get('/dashboard', NgoAuth, NgoAuthCtrl.dashboard);

module.exports = router;
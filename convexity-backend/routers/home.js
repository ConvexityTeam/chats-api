const express = require('express');
var router = express.Router();
const HomeController = require('../controllers/HomeController');
// const {Auth} = require('../middleware/main-auth'); //Auhorization middleware
const multer = require('../middleware/multer-config');//for uploading of profile picture and fingerprint
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
//users endpoint
router.post('/dashboard', multer, HomeController.dashboard);
router.get('/', HomeController.generateOtp);
module.exports = router;
const router = require('express').Router();
const { AppController } = require('../controllers');

router.get('/test/sms/:phone', AppController.testSms);

module.exports = router;

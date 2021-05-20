const express = require('express');
const router = express.Router();
const NgosController = require('../controllers/NgosController');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
// const auth = require('../middleware/auth');
router.get('/', NgosController.getAllNgos);
router.get('/:id', NgosController.getANgo);
// router.post('/', auth, NgosController.addUser);
// router.put('/:id', auth, NgosController.updatedUser);
// router.delete('/:id', auth, NgosController.deleteUser);

module.exports = router;
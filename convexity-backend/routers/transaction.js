const express = require('express');
const router = express.Router();
const TransactionsController = require('../controllers/TransactionsController');
const auth = require('../middleware/auth');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
router.get('/', auth, TransactionsController.getAllTransactions);
router.get('/:id', auth, TransactionsController.getATransaction);
router.post('/', auth, TransactionsController.addTransaction);
router.put('/:id', auth, TransactionsController.updatedTransaction);
router.delete('/:id', auth, TransactionsController.deleteTransaction);
router.post('/confirm-otp', TransactionsController.confirmOtp);
router.get('/confirm-transaction/:id', TransactionsController.updateTransaction);
module.exports = router;
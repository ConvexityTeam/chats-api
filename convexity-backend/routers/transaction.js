const express = require('express');
const router = express.Router();
const TransactionsController = require('../controllers/TransactionsController');
const { Auth } = require('../middleware/auth');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);
router.get('/', Auth, TransactionsController.getAllTransactions);
router.get('/:id', Auth, TransactionsController.getATransaction);
router.post('/', Auth, TransactionsController.addTransaction);
router.put('/:id', Auth, TransactionsController.updatedTransaction);
router.delete('/:id', Auth, TransactionsController.deleteTransaction);
router.post('/confirm-otp', TransactionsController.confirmOtp);
router.get('/confirm-transaction/:id', TransactionsController.updateTransaction);
module.exports = router;
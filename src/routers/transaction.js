const router = require('express').Router();

const { Auth } = require('../middleware/auth');
const TransactionsController = require('../controllers/TransactionsController');

router.get('/', Auth, TransactionsController.getAllTransactions);
router.get('/:id', Auth, TransactionsController.getATransaction);
router.post('/', Auth, TransactionsController.addTransaction);
router.put('/:id', Auth, TransactionsController.updatedTransaction);
router.delete('/:id', Auth, TransactionsController.deleteTransaction);
router.post('/confirm-otp', TransactionsController.confirmOtp);
router.get('/confirm-transaction/:id', TransactionsController.updateTransaction);
module.exports = router;
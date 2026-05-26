// routes/transactions.js

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

router.get('/completed-count', controller.getCompletedCount);

router.use(protect); // Protect all transaction routes

router.route('/')
  .get(controller.getAllTransactions)    // GET  /api/transactions
  .post(controller.createTransaction);  // POST /api/transactions

router.route('/:id')
  .get(controller.getTransactionById);  // GET /api/transactions/:id

// Special action routes
router.put('/:id/status', controller.updateStatus); // Update status
router.put('/:id/review', controller.addReview);    // Add review

module.exports = router;
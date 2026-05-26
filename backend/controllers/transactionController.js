// controllers/transactionController.js
// Handles borrow requests, approvals, pickups, returns, and reviews

const Transaction = require('../models/Transaction');
const User        = require('../models/User');
const Notification = require('../models/Notification');
const Activity     = require('../models/Activity');

// ─────────────────────────────────────────────
// @desc    Create a borrow request
// @route   POST /api/transactions
// ─────────────────────────────────────────────
exports.createTransaction = async (req, res, next) => {
  try {
    req.body.borrower = req.user._id;
    const transaction = await Transaction.create(req.body);

    // Create a notification for the lender
    await Notification.create({
      recipient: req.body.lender,
      type: 'borrow_request',
      message: `${req.user.name} wants to borrow your item. Check your requests!`,
      relatedTransaction: transaction._id,
      relatedListing: req.body.listing,
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get all transactions (optionally filter by user)
// @route   GET /api/transactions?userId=abc123
// ─────────────────────────────────────────────
exports.getAllTransactions = async (req, res, next) => {
  try {
    const filter = {};

    // Filter transactions involving current user
    if (req.user) {
      filter.$or = [{ borrower: req.user._id }, { lender: req.user._id }];
    }

    const transactions = await Transaction.find(filter)
      .populate('borrower', 'name email trustScore')
      .populate('lender',   'name email trustScore')
      .populate('listing',  'title type')
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get single transaction
// @route   GET /api/transactions/:id
// ─────────────────────────────────────────────
exports.getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('borrower', 'name email phone trustScore')
      .populate('lender',   'name email phone trustScore')
      .populate('listing',  'title type description');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Update transaction status
// @route   PUT /api/transactions/:id/status
// Body: { "status": "approved" }
// ─────────────────────────────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'pickedUp', 'returned', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const transaction = await Transaction.findById(req.params.id).populate('listing');
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Ownership & permission validation
    if (status === 'approved') {
      if (transaction.lender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Only the lender can approve requests' });
      }
    }
    if (status === 'cancelled') {
      if (transaction.borrower.toString() !== req.user._id.toString() && transaction.lender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to cancel this transaction' });
      }
    }
    if (status === 'pickedUp') {
      if (transaction.borrower.toString() !== req.user._id.toString() && transaction.lender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }
    if (status === 'returned') {
      if (transaction.lender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Only the lender can mark as returned' });
      }
    }

    const update = { status };
    if (status === 'pickedUp') update.actualPickupDate = new Date();
    if (status === 'returned') update.returnDate = new Date();

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate('listing');

    // Helper to calculate badges dynamically
    const getUpdatedBadge = (score, currentBadge) => {
      if (score >= 70) {
        if (currentBadge && (currentBadge.includes('Hero') || currentBadge.includes('Borrower'))) {
          return currentBadge;
        }
        return '✔ Trusted Member';
      } else if (score >= 50) {
        return '✔ Active Member';
      } else {
        return '⚠ New User';
      }
    };

    const borrowerUser = await User.findById(transaction.borrower);
    const lenderUser = await User.findById(transaction.lender);
    const listingTitle = transaction.listing?.title || 'item';

    if (status === 'approved') {
      await Activity.create({
        userId: transaction.lender,
        action: `Approved request from ${borrowerUser.name} to borrow "${listingTitle}"`
      });
      await Activity.create({
        userId: transaction.borrower,
        action: `Borrow request for "${listingTitle}" was approved by ${lenderUser.name}`
      });

      await Notification.create({
        recipient: transaction.borrower,
        type: 'request_approved',
        message: `Your borrow request for "${listingTitle}" was approved! Coordinate pickup with the lender.`,
        relatedTransaction: transaction._id,
      });
    }

    if (status === 'pickedUp') {
      await Activity.create({
        userId: transaction.borrower,
        action: `Picked up item "${listingTitle}" from ${lenderUser.name}`
      });
      await Activity.create({
        userId: transaction.lender,
        action: `Handed over item "${listingTitle}" to ${borrowerUser.name}`
      });

      await Notification.create({
        recipient: transaction.borrower,
        type: 'match_found',
        message: `You confirmed picking up "${listingTitle}". Please return it on time!`,
        relatedTransaction: transaction._id,
      });
      await Notification.create({
        recipient: transaction.lender,
        type: 'match_found',
        message: `${borrowerUser.name} confirmed they picked up your "${listingTitle}".`,
        relatedTransaction: transaction._id,
      });
    }

    if (status === 'returned') {
      const isEmergency = transaction.listing && 
        (transaction.listing.resourceDetails?.isEmergency || 
         transaction.listing.title.toLowerCase().includes('urgent') || 
         transaction.listing.title.toLowerCase().includes('emergency'));

      const bOld = borrowerUser.trustScore || 50;
      const lOld = lenderUser.trustScore || 50;

      const bChange = 5;
      const lChange = isEmergency ? 8 : 2;

      borrowerUser.trustScore = Math.min(100, Math.max(0, bOld + bChange));
      lenderUser.trustScore = Math.min(100, Math.max(0, lOld + lChange));

      borrowerUser.successfulExchanges = (borrowerUser.successfulExchanges || 0) + 1;
      lenderUser.successfulExchanges = (lenderUser.successfulExchanges || 0) + 1;

      borrowerUser.badge = getUpdatedBadge(borrowerUser.trustScore, borrowerUser.badge);
      lenderUser.badge = getUpdatedBadge(lenderUser.trustScore, lenderUser.badge);

      await borrowerUser.save();
      await lenderUser.save();

      await Activity.create({
        userId: transaction.borrower,
        action: `Returned borrowed item "${listingTitle}" on-time to ${lenderUser.name} (+${bChange} Trust Score)`
      });
      await Activity.create({
        userId: transaction.lender,
        action: isEmergency
          ? `Provided critical emergency support: Lent "${listingTitle}" to ${borrowerUser.name} (+${lChange} Trust Score)`
          : `Lent out item "${listingTitle}" to ${borrowerUser.name} successfully (+${lChange} Trust Score)`
      });

      await Notification.create({
        recipient: transaction.borrower,
        type: 'trust_update',
        message: `Returned "${listingTitle}" on-time! Trust: ${bOld} → ${borrowerUser.trustScore} (+${bChange}). Badge: ${borrowerUser.badge}`,
        relatedTransaction: transaction._id,
      });
      await Notification.create({
        recipient: transaction.lender,
        type: 'trust_update',
        message: isEmergency
          ? `Critical emergency help completed! Trust: ${lOld} → ${lenderUser.trustScore} (+${lChange}). Badge: ${lenderUser.badge}`
          : `Lent "${listingTitle}" successfully! Trust: ${lOld} → ${lenderUser.trustScore} (+${lChange}). Badge: ${lenderUser.badge}`,
        relatedTransaction: transaction._id,
      });
    }

    if (status === 'cancelled') {
      const isBorrower = req.user._id.toString() === transaction.borrower.toString();
      
      if (isBorrower) {
        const bOld = borrowerUser.trustScore || 50;
        borrowerUser.trustScore = Math.min(100, Math.max(0, bOld - 5));
        borrowerUser.badge = getUpdatedBadge(borrowerUser.trustScore, borrowerUser.badge);
        await borrowerUser.save();

        await Activity.create({
          userId: transaction.borrower,
          action: `Cancelled borrow request for "${listingTitle}" (-5 Trust Score)`
        });
        await Notification.create({
          recipient: transaction.borrower,
          type: 'trust_update',
          message: `Request cancelled by you. Trust score: ${bOld} → ${borrowerUser.trustScore} (-5).`
        });
        await Notification.create({
          recipient: transaction.lender,
          type: 'borrow_request',
          message: `${borrowerUser.name} cancelled their request for "${listingTitle}".`
        });
      } else {
        const lOld = lenderUser.trustScore || 50;
        const penalty = (transaction.status === 'approved' || transaction.status === 'pickedUp') ? 10 : 2;

        lenderUser.trustScore = Math.min(100, Math.max(0, lOld - penalty));
        lenderUser.badge = getUpdatedBadge(lenderUser.trustScore, lenderUser.badge);
        await lenderUser.save();

        await Activity.create({
          userId: transaction.lender,
          action: `Rejected/cancelled sharing request for "${listingTitle}" (-${penalty} Trust Score)`
        });
        await Notification.create({
          recipient: transaction.lender,
          type: 'trust_update',
          message: `Sharing request cancelled/rejected by you. Trust score: ${lOld} → ${lenderUser.trustScore} (-${penalty}).`
        });
        await Notification.create({
          recipient: transaction.borrower,
          type: 'request_approved',
          message: `Your request for "${listingTitle}" was cancelled/declined by the lender.`
        });
      }
    }

    res.status(200).json({ success: true, data: updatedTransaction });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Add a review after transaction completes
// @route   PUT /api/transactions/:id/review
// Body: { "reviewerRole": "lender", "rating": 5, "comment": "Great borrower!" }
// ─────────────────────────────────────────────
exports.addReview = async (req, res, next) => {
  try {
    const { reviewerRole, rating, comment } = req.body;

    // Build the update path dynamically
    // reviewerRole = "lender" → updates review.byLender
    const reviewField = reviewerRole === 'lender' ? 'review.byLender' : 'review.byBorrower';

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { [reviewField]: { rating, comment } },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Update the reviewed person's average rating
    const reviewedUserId =
      reviewerRole === 'lender' ? transaction.borrower : transaction.lender;

    const user = await User.findById(reviewedUserId);
    const newTotal  = user.totalRatings + 1;
    const newRating = ((user.rating * user.totalRatings) + rating) / newTotal;

    await User.findByIdAndUpdate(reviewedUserId, {
      rating: Math.round(newRating * 10) / 10, // Round to 1 decimal
      totalRatings: newTotal,
    });

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get count of all completed exchanges (returned status)
// @route   GET /api/transactions/completed-count (Public)
// ─────────────────────────────────────────────
exports.getCompletedCount = async (req, res, next) => {
  try {
    const count = await Transaction.countDocuments({ status: 'returned' });
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
};
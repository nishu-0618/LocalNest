// models/Transaction.js
// Tracks the full lifecycle of a borrow/exchange

const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },

    // The person who wants to borrow
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // The person who owns the item
    lender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Transaction moves through these stages
    status: {
      type: String,
      enum: ['pending', 'approved', 'pickedUp', 'returned', 'cancelled'],
      default: 'pending',
    },

    // When borrower wants to pick up
    requestedPickupDate: Date,

    // When item was actually picked up
    actualPickupDate: Date,

    // When item was actually returned
    returnDate: Date,

    // How many days they want to borrow
    borrowDays: {
      type: Number,
      required: true,
    },

    // Message from borrower when requesting
    message: String,

    // Review after transaction completes
    review: {
      // Lender reviews the borrower
      byLender: {
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
      },
      // Borrower reviews the lender
      byBorrower: {
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
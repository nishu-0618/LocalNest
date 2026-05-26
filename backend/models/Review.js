// models/Review.js
// User-to-user reviews after a completed transaction

const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    // Who is writing the review
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Who is being reviewed
    revieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Which listing this review is about (optional)
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      maxlength: 500,
      default: '',
    },

    // What type of interaction was reviewed
    interactionType: {
      type: String,
      enum: ['lend', 'housing', 'skill', 'general'],
      default: 'general',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent a user from reviewing the same person twice for the same listing
ReviewSchema.index({ reviewerId: 1, revieweeId: 1, listingId: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);

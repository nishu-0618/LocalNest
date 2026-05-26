// models/Listing.js
// Expanded blueprint for all listings: housing, lend items, skills

const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema(
  {
    // Who posted this listing
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    // What kind of listing is this?
    type: {
      type: String,
      enum: ['housing', 'resource', 'skill'],
      required: true,
    },

    // Tags help with filtering
    tags: [String],

    // Image URLs (Cloudinary or local paths)
    images: {
      type: [String],
      default: [],
    },

    // Users who saved/favorited this listing
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // GeoJSON location
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: String,
    },

    // ─────────── HOUSING DETAILS ───────────
    housingDetails: {
      rent: Number,
      deposit: Number,
      flatType: {
        type: String,
        enum: ['pg', '1bhk', '2bhk', '3bhk', 'shared', 'hostel', 'sublet', 'single', 'flat'],
      },
      // Legacy field kept for compatibility
      roomType: {
        type: String,
        enum: ['single', 'shared', 'pg', 'flat', '1bhk', '2bhk', '3bhk', 'hostel', 'sublet'],
      },
      genderPreference: {
        type: String,
        enum: ['male', 'female', 'any'],
        default: 'any',
      },
      furnished: {
        type: String,
        enum: ['furnished', 'semi-furnished', 'unfurnished'],
        default: 'unfurnished',
      },
      smokingAllowed: { type: Boolean, default: false },
      petsAllowed:    { type: Boolean, default: false },
      apartmentName:  String,
      societyName:    String,
      buildingName:   String,
      locality:       String,
      amenities:      [String],
      availableFrom:  Date,
      moveInDate:     Date,
    },

    // ─────────── RESOURCE / LEND DETAILS ───────────
    resourceDetails: {
      itemName: String,
      category: {
        type: String,
        enum: ['electronics', 'tools', 'books', 'furniture', 'emergency', 'sports', 'kitchen', 'others'],
        default: 'others',
      },
      condition: {
        type: String,
        enum: ['new', 'good', 'fair', 'poor'],
        default: 'good',
      },
      borrowDurationDays: Number,
      deposit:            Number,    // Refundable deposit amount
      availableToday:     { type: Boolean, default: true },
      isEmergency:        { type: Boolean, default: false },
      isFree:             { type: Boolean, default: true },
    },

    // ─────────── SKILL DETAILS ───────────
    skillDetails: {
      skillName:    String,
      ratePerHour:  Number,
      isExchange:   Boolean,
    },

    // Auto-expiry: listing disappears after this date
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index
ListingSchema.index({ location: '2dsphere' });
// Text index for search
ListingSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Listing', ListingSchema);
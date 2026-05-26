// models/User.js
// This is the blueprint for every user stored in MongoDB

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true, // Removes extra spaces
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // No two users can have the same email
      lowercase: true,
    },

    phone: {
      type: String,
      required: [true, 'Phone is required'],
    },

    password: {
      type: String,
      required: false, // Optional for users created via listing form
      select: false, // Don't return password in query results by default
    },

    role: {
      type: String,
      enum: ['lender', 'borrower', 'both'],
      default: 'both',
    },

    // GeoJSON format — standard way to store coordinates in MongoDB
    // This enables geospatial queries ("find users near me")
    location: {
      type: {
        type: String,
        enum: ['Point'], // Must always be 'Point'
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude] — note: longitude first!
        required: true,
      },
      address: {
        type: String, // Human-readable address like "Koramangala, Bangalore"
      },
    },

    // Trust score starts at 50, goes up/down based on behavior
    trustScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },

    // Average rating from other users
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // How many people have rated this user
    totalRatings: {
      type: Number,
      default: 0,
    },

    // List of things this user can lend/offer
    resourcesOffered: [String], // e.g. ["bicycle", "drill", "textbooks"]

    // List of things this user needs
    resourcesNeeded: [String], // e.g. ["laptop", "guitar"]

    // Housing preferences (for roommate matching)
    housingPreferences: {
      lookingForRoommate: { type: Boolean, default: false },
      budget: { type: Number }, // Monthly rent budget in INR
      preferredGender: {
        type: String,
        enum: ['male', 'female', 'any'],
        default: 'any',
      },
    },

    bio: {
      type: String,
      maxlength: 300,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    profileImage: {
      type: String,
      default: '',
    },

    locality: {
      type: String,
      default: 'Bangalore',
    },

    responseRate: {
      type: Number,
      default: 100,
    },

    verificationStatus: {
      type: String,
      enum: ['verified', 'pending', 'none'],
      default: 'none',
    },

    successfulExchanges: {
      type: Number,
      default: 0,
    },

    badge: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// 🔑 GEOSPATIAL INDEX
// This is what makes "find nearby users" fast
// Without this index, MongoDB would scan EVERY user — very slow
UserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);
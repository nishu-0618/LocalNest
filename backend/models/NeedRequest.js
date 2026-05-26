// models/NeedRequest.js
// Collection for users who NEED an item — community request board

const mongoose = require('mongoose');

const NeedRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    category: {
      type: String,
      enum: ['electronics', 'tools', 'books', 'furniture', 'emergency', 'sports', 'kitchen', 'others'],
      default: 'others',
    },

    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

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

    requiredBy: {
      type: Date,
    },

    fulfilledStatus: {
      type: Boolean,
      default: false,
    },

    fulfilledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Track who has been notified so we don't spam
    notifiedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index for nearby queries
NeedRequestSchema.index({ location: '2dsphere' });
// Text index for search
NeedRequestSchema.index({ itemName: 'text', description: 'text' });

module.exports = mongoose.model('NeedRequest', NeedRequestSchema);

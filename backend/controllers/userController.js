// controllers/userController.js
// All the logic for user-related API endpoints

const User = require('../models/User');
const Activity = require('../models/Activity');
const jwt = require('jsonwebtoken');

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'localnestsecret123', {
    expiresIn: '30d',
  });
};

// ─────────────────────────────────────────────
// @desc    Create a new user
// @route   POST /api/users
// ─────────────────────────────────────────────
exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);

    // Generate temporary token for new users to post listings
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token, // Include token so user can immediately post listings
      data: user
    });
  } catch (error) {
    next(error); // Passes error to errorHandler middleware
  }
};

// ─────────────────────────────────────────────
// @desc    Get all users
// @route   GET /api/users
// ─────────────────────────────────────────────
exports.getAllUsers = async (req, res, next) => {
  try {
    // Pagination: ?page=1&limit=10
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const users = await User.find({ isActive: true })
      .select('-__v')       // Hide the __v field MongoDB adds
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get single user by ID
// @route   GET /api/users/:id
// ─────────────────────────────────────────────
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Update user
// @route   PUT /api/users/:id
// ─────────────────────────────────────────────
exports.updateUser = async (req, res, next) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this profile' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,           // Return the updated document
        runValidators: true, // Re-run schema validations on update
      }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Delete user (soft delete — just marks inactive)
// @route   DELETE /api/users/:id
// ─────────────────────────────────────────────
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to deactivate this profile' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Find users near a location
// @route   GET /api/users/nearby?lng=77.5946&lat=12.9716&radius=5000
// radius is in meters (5000 = 5km)
// ─────────────────────────────────────────────
exports.getNearbyUsers = async (req, res, next) => {
  try {
    const { lng, lat, radius = 5000 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        message: 'Please provide lng and lat query parameters',
      });
    }

    // $geoWithin + $centerSphere = MongoDB geospatial query
    // Finds all users within the radius circle
    const users = await User.find({
      isActive: true,
      location: {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(lng), parseFloat(lat)],
            parseFloat(radius) / 6378100, // Convert meters to radians
          ],
        },
      },
    }).select('-__v');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get user activities
// @route   GET /api/users/:id/activities
// ─────────────────────────────────────────────
exports.getUserActivities = async (req, res, next) => {
  try {
    const activities = await Activity.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json({ success: true, count: activities.length, data: activities });
  } catch (error) {
    next(error);
  }
};
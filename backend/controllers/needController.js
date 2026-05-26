// controllers/needController.js
// Logic for the community "Need Items" request board

const NeedRequest = require('../models/NeedRequest');
const Notification = require('../models/Notification');
const Listing = require('../models/Listing');

// ─────────────────────────────────────────────
// @desc    Get all need requests (with optional geo + filters)
// @route   GET /api/needs
// ─────────────────────────────────────────────
exports.getAllNeeds = async (req, res, next) => {
  try {
    const { lng, lat, radius = 10000, category, urgency, q, page = 1, limit = 20, excludeEmergency } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = { isActive: true, fulfilledStatus: false };

    if (category) {
      filter.category = category;
    } else if (excludeEmergency === 'true') {
      filter.category = { $ne: 'emergency' };
    }
    
    if (urgency)  filter.urgency  = urgency;

    // Text search
    if (q) {
      filter.$text = { $search: q };
    }

    // Geo filter
    if (lng && lat) {
      filter.location = {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(lng), parseFloat(lat)],
            parseFloat(radius) / 6378100,
          ],
        },
      };
    }

    const needs = await NeedRequest.find(filter)
      .populate('userId', 'name trustScore rating location')
      .select('-notifiedUsers -__v')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ urgency: -1, createdAt: -1 }); // critical first, then newest

    const total = await NeedRequest.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: needs.length,
      total,
      data: needs,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Create a need request + notify nearby lenders
// @route   POST /api/needs
// ─────────────────────────────────────────────
exports.createNeed = async (req, res, next) => {
  try {
    const need = await NeedRequest.create(req.body);

    // Find nearby lenders who have this item
    try {
      const { coordinates } = need.location;
      const nearbyListings = await Listing.find({
        type: 'resource',
        isActive: true,
        'resourceDetails.itemName': { $regex: new RegExp(need.itemName, 'i') },
        location: {
          $geoWithin: {
            $centerSphere: [coordinates, 10000 / 6378100], // 10km radius
          },
        },
      }).populate('postedBy', '_id');

      // Create a notification for each nearby lender
      const notifPromises = nearbyListings.map(listing =>
        Notification.create({
          recipient: listing.postedBy._id,
          type: 'item_needed_nearby',
          message: `Someone near you needs "${need.itemName}". Do you have one to lend?`,
          relatedListing: listing._id,
        }).catch(() => null) // Don't fail if notification fails
      );

      await Promise.all(notifPromises);
    } catch (notifErr) {
      // Notification failure should not block the main response
      console.error('Notification error:', notifErr.message);
    }

    res.status(201).json({ success: true, data: need });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get a single need request
// @route   GET /api/needs/:id
// ─────────────────────────────────────────────
exports.getNeedById = async (req, res, next) => {
  try {
    const need = await NeedRequest.findById(req.params.id)
      .populate('userId', 'name trustScore rating location');
    if (!need) return res.status(404).json({ success: false, message: 'Need request not found' });
    res.status(200).json({ success: true, data: need });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Update a need request (e.g. mark fulfilled)
// @route   PUT /api/needs/:id
// ─────────────────────────────────────────────
exports.updateNeed = async (req, res, next) => {
  try {
    const need = await NeedRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!need) return res.status(404).json({ success: false, message: 'Need request not found' });
    res.status(200).json({ success: true, data: need });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Delete (soft delete) a need request
// @route   DELETE /api/needs/:id
// ─────────────────────────────────────────────
exports.deleteNeed = async (req, res, next) => {
  try {
    const need = await NeedRequest.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!need) return res.status(404).json({ success: false, message: 'Need request not found' });
    res.status(200).json({ success: true, message: 'Need request removed' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Count of open needs for a specific item (nearby demand)
// @route   GET /api/needs/demand?item=drill&lng=77.59&lat=12.97
// ─────────────────────────────────────────────
exports.getNearbyDemand = async (req, res, next) => {
  try {
    const { item, lng, lat, radius = 10000 } = req.query;
    if (!item) return res.status(400).json({ success: false, message: 'item query required' });

    const filter = {
      isActive: true,
      fulfilledStatus: false,
      itemName: { $regex: new RegExp(item, 'i') },
    };

    if (lng && lat) {
      filter.location = {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(lng), parseFloat(lat)],
            parseFloat(radius) / 6378100,
          ],
        },
      };
    }

    const count = await NeedRequest.countDocuments(filter);
    res.status(200).json({ success: true, count, item });
  } catch (error) {
    next(error);
  }
};

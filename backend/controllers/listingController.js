const Listing = require('../models/Listing');
const User = require('../models/User');

// Helper to handle both standard find and geoNear aggregation
const fetchListings = async (filter, reqQuery, defaultSort) => {
  const { lng, lat, radius, sort } = reqQuery;
  const page = parseInt(reqQuery.page) || 1;
  const limit = parseInt(reqQuery.limit) || 20;
  const skip = (page - 1) * limit;
  
  let listings = [];
  let total = 0;

  // Determine sorting
  let sortObj = defaultSort || { createdAt: -1 };
  if (sort === 'price_asc') sortObj = { 'housingDetails.rent': 1, 'resourceDetails.deposit': 1 };
  if (sort === 'price_desc') sortObj = { 'housingDetails.rent': -1, 'resourceDetails.deposit': -1 };
  if (sort === 'newest') sortObj = { createdAt: -1 };

  if (lng && lat && radius) {
    // GeoNear MUST be the first stage
    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distanceInMeters',
          maxDistance: parseFloat(radius) * 1000, // convert km to meters, wait user gives meters? "3km" -> frontend passes 3000
          spherical: true,
          query: filter
        }
      }
    ];

    if (sort === 'distance') {
       pipeline.push({ $sort: { distanceInMeters: 1 } });
    } else {
       pipeline.push({ $sort: sortObj });
    }
    
    // Count total before skip/limit
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Listing.aggregate(countPipeline);
    total = countResult.length > 0 ? countResult[0].total : 0;

    pipeline.push({ $skip: skip }, { $limit: limit });

    listings = await Listing.aggregate(pipeline);
    
    // Populate nested paths
    await Listing.populate(listings, { 
      path: 'postedBy', 
      select: 'name email phone trustScore rating location' 
    });

  } else {
    // Standard Query
    listings = await Listing.find(filter)
      .populate('postedBy', 'name email phone trustScore rating location')
      .select('-__v')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    total = await Listing.countDocuments(filter);
  }

  return { listings, total, page, pages: Math.ceil(total / limit) };
};

// ─────────────────────────────────────────────
// @desc    Get all listings
// ─────────────────────────────────────────────
exports.getAllListings = async (req, res, next) => {
  try {
    const { type, tags } = req.query;
    const filter = { isActive: true };
    
    // Explicitly exclude emergency resources from normal feeds
    filter['resourceDetails.isEmergency'] = { $ne: true };
    
    if (type)  filter.type = type;
    if (tags)  filter.tags = { $in: tags.split(',') };

    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ];

    const result = await fetchListings(filter, req.query, { createdAt: -1 });

    res.status(200).json({
      success: true,
      count: result.listings.length,
      total: result.total,
      page: result.page,
      pages: result.pages,
      data: result.listings,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get HOUSING listings
// ─────────────────────────────────────────────
exports.getHousingListings = async (req, res, next) => {
  try {
    const { minRent, maxRent, genderPreference, flatType, furnished, societyName } = req.query;

    const filter = { isActive: true, type: 'housing' };
    
    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ];

    if (minRent || maxRent) {
      filter['housingDetails.rent'] = {};
      if (minRent) filter['housingDetails.rent'].$gte = parseInt(minRent);
      if (maxRent) filter['housingDetails.rent'].$lte = parseInt(maxRent);
    }
    if (genderPreference && genderPreference !== 'any') {
      filter['housingDetails.genderPreference'] = genderPreference;
    }
    if (flatType && flatType !== 'all') {
      filter['housingDetails.flatType'] = flatType;
    }
    if (furnished && furnished !== 'all') {
      filter['housingDetails.furnished'] = furnished;
    }
    if (societyName) {
      filter['housingDetails.societyName'] = { $regex: new RegExp(societyName, 'i') };
    }

    const result = await fetchListings(filter, req.query, { createdAt: -1 });

    res.status(200).json({ success: true, count: result.listings.length, data: result.listings });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get LEND listings
// ─────────────────────────────────────────────
exports.getLendListings = async (req, res, next) => {
  try {
    const { category, isFree, availableToday } = req.query;

    const filter = { isActive: true, type: 'resource' };
    
    // Explicitly exclude emergency resources from normal feeds
    filter['resourceDetails.isEmergency'] = { $ne: true };
    
    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ];

    if (category && category !== 'all') {
      filter['resourceDetails.category'] = category;
    }
    if (isFree === 'true') {
      filter['resourceDetails.isFree'] = true;
    }
    if (availableToday === 'true') {
      filter['resourceDetails.availableToday'] = true;
    }

    const result = await fetchListings(filter, req.query, { 'resourceDetails.isEmergency': -1, createdAt: -1 });

    res.status(200).json({ success: true, count: result.listings.length, data: result.listings });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Create a listing
// ─────────────────────────────────────────────
exports.createListing = async (req, res, next) => {
  try {
    if (req.user) {
      req.body.postedBy = req.user._id;
    }
    const listing = await Listing.create(req.body);
    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get single listing
// ─────────────────────────────────────────────
exports.getListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('postedBy', 'name email phone trustScore rating location');

    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    res.status(200).json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Update listing
// ─────────────────────────────────────────────
exports.updateListing = async (req, res, next) => {
  try {
    let listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    if (listing.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this listing' });
    }

    listing = await Listing.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Delete listing
// ─────────────────────────────────────────────
exports.deleteListing = async (req, res, next) => {
  try {
    let listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    if (listing.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this listing' });
    }

    listing = await Listing.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    res.status(200).json({ success: true, message: 'Listing removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Find listings near a location (backward compat)
// ─────────────────────────────────────────────
exports.getNearbyListings = async (req, res, next) => {
  req.query.sort = 'distance';
  return exports.getAllListings(req, res, next);
};

// ─────────────────────────────────────────────
// @desc    Full-text search listings
// ─────────────────────────────────────────────
exports.searchListings = async (req, res, next) => {
  try {
    const { q, lng, lat, radius } = req.query;
    if (!q) return res.status(400).json({ success: false, message: 'Search query required' });

    const filter = { $text: { $search: q }, isActive: true };
    const result = await fetchListings(filter, req.query, { score: { $meta: "textScore" } });

    res.status(200).json({ success: true, count: result.listings.length, data: result.listings });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Toggle saving a listing for a user
// ─────────────────────────────────────────────
exports.toggleSaveListing = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    const index = listing.savedBy.indexOf(userId);
    let saved = false;

    if (index === -1) {
      listing.savedBy.push(userId);
      saved = true;
    } else {
      listing.savedBy.splice(index, 1);
    }

    await listing.save();
    res.status(200).json({ success: true, saved, message: saved ? 'Listing saved' : 'Listing unsaved' });
  } catch (error) {
    next(error);
  }
};
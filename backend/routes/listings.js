// routes/listings.js

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/listingController');
const { protect } = require('../middleware/auth');

// Special routes FIRST (before /:id)
router.get('/nearby', controller.getNearbyListings);
router.get('/search', controller.searchListings);
router.get('/housing', controller.getHousingListings);
router.get('/lend', controller.getLendListings);
router.put('/save/:id', protect, controller.toggleSaveListing);

router.route('/')
  .get(controller.getAllListings)    // GET  /api/listings
  .post(protect, controller.createListing);  // POST /api/listings (protected)

router.route('/:id')
  .get(controller.getListingById)    // GET    /api/listings/:id
  .put(protect, controller.updateListing)     // PUT    /api/listings/:id (protected)
  .delete(protect, controller.deleteListing); // DELETE /api/listings/:id (protected)

module.exports = router;
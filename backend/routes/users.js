// routes/users.js
// Maps URL paths to controller functions

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// GET  /api/users/nearby  ← must be ABOVE /:id or Express confuses "nearby" as an ID
router.get('/nearby', controller.getNearbyUsers);

router.route('/')
  .get(controller.getAllUsers)    // GET  /api/users
  .post(controller.createUser);  // POST /api/users

router.route('/:id')
  .get(controller.getUserById)    // GET    /api/users/:id
  .put(protect, controller.updateUser)     // PUT    /api/users/:id (protected)
  .delete(protect, controller.deleteUser); // DELETE /api/users/:id (protected)

router.get('/:id/activities', controller.getUserActivities);

module.exports = router;
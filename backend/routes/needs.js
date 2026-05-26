// routes/needs.js

const express = require('express');
const router = express.Router();
const controller = require('../controllers/needController');

router.get('/demand', controller.getNearbyDemand);

router.route('/')
  .get(controller.getAllNeeds)
  .post(controller.createNeed);

router.route('/:id')
  .get(controller.getNeedById)
  .put(controller.updateNeed)
  .delete(controller.deleteNeed);

module.exports = router;

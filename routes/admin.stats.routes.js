// routes/admin.stats.routes.js
const express = require('express');
const router = express.Router();
const statsCtrl = require('../controllers/stats.controller');

router.get('/stats', statsCtrl.getStats);
module.exports = router;

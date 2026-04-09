const express = require("express");
const { getOrCreateScorecard, addDelivery, getStats } = require("../controllers/scorecardController");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.get("/:bookingId", auth, getOrCreateScorecard);
router.get("/:bookingId/stats", auth, getStats);
router.post("/:bookingId/deliveries", auth, addDelivery);

module.exports = router;


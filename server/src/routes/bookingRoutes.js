const express = require("express");
const {
  createBooking,
  listMyBookings,
  listOwnerBookings,
  ownerUpdateBookingStatus,
  ownerCreateBooking,
} = require("../controllers/bookingController");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

router.post("/", auth, requireRole("Player"), createBooking);
router.get("/mine", auth, requireRole("Player"), listMyBookings);

router.get("/owner", auth, requireRole("Owner"), listOwnerBookings);
router.patch("/:id/status", auth, requireRole("Owner"), ownerUpdateBookingStatus);
router.post("/owner/create", auth, requireRole("Owner"), ownerCreateBooking);

module.exports = router;


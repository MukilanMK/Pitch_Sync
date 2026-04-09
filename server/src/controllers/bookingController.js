const { Booking } = require("../models/Booking");
const { Turf } = require("../models/Turf");

const isValidTimeSlot = (timeSlot) => {
  if (typeof timeSlot !== "string") return false;
  // Very small validation: "HH:MM-HH:MM"
  return /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(timeSlot.trim());
};

const createBooking = async (req, res, next) => {
  try {
    const { turfId, date, timeSlot } = req.body;
    if (!turfId || !date || !timeSlot) {
      return res.status(400).json({ message: "turfId, date, timeSlot are required" });
    }
    if (!isValidTimeSlot(timeSlot)) {
      return res.status(400).json({ message: "timeSlot must be like HH:MM-HH:MM" });
    }

    const turf = await Turf.findById(turfId);
    if (!turf) return res.status(404).json({ message: "Turf not found" });

    const booking = await Booking.create({
      turfId,
      playerId: req.user.id,
      date,
      timeSlot,
      status: "Pending",
      bookedForName: req.user?.name || "",
      createdByRole: "Player",
      createdByUserId: req.user.id,
    });

    return res.status(201).json({ booking });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "This slot is already booked" });
    }
    return next(err);
  }
};

const listMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ playerId: req.user.id })
      .sort({ date: 1, timeSlot: 1 })
      .populate("turfId");

    return res.json({ bookings });
  } catch (err) {
    return next(err);
  }
};

const listOwnerBookings = async (req, res, next) => {
  try {
    const myTurfs = await Turf.find({ ownerId: req.user.id }).select("_id");
    const turfIds = myTurfs.map((t) => t._id);

    const bookings = await Booking.find({ turfId: { $in: turfIds } })
      .sort({ date: 1, timeSlot: 1 })
      .populate("turfId")
      .populate("playerId", "name email role");

    return res.json({ bookings });
  } catch (err) {
    return next(err);
  }
};

const ownerUpdateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status || !["Confirmed", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "status must be Confirmed or Cancelled" });
    }

    const booking = await Booking.findById(id).populate("turfId");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (String(booking.turfId?.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Backfill legacy bookings that existed before createdBy* fields were added
    if (!booking.createdByRole) booking.createdByRole = booking.playerId ? "Player" : "Owner";
    if (!booking.createdByUserId) booking.createdByUserId = booking.playerId || booking.turfId?.ownerId || req.user.id;

    booking.status = status;
    await booking.save();

    return res.json({ booking });
  } catch (err) {
    return next(err);
  }
};

const ownerCreateBooking = async (req, res, next) => {
  try {
    const { turfId, date, timeSlot, bookedForName = "", bookedForPhone = "" } = req.body || {};
    if (!turfId || !date || !timeSlot) {
      return res.status(400).json({ message: "turfId, date, timeSlot are required" });
    }
    if (!isValidTimeSlot(timeSlot)) {
      return res.status(400).json({ message: "timeSlot must be like HH:MM-HH:MM" });
    }

    const turf = await Turf.findById(turfId);
    if (!turf) return res.status(404).json({ message: "Turf not found" });
    if (String(turf.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const booking = await Booking.create({
      turfId,
      playerId: null,
      date,
      timeSlot,
      status: "Confirmed",
      bookedForName: bookedForName.trim(),
      bookedForPhone: bookedForPhone.trim(),
      createdByRole: "Owner",
      createdByUserId: req.user.id,
    });

    return res.status(201).json({ booking });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "This slot is already booked" });
    }
    return next(err);
  }
};

module.exports = { createBooking, listMyBookings, listOwnerBookings, ownerUpdateBookingStatus, ownerCreateBooking };


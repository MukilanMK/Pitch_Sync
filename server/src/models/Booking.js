const mongoose = require("mongoose");

const BOOKING_STATUS = ["Pending", "Confirmed", "Cancelled"];

const bookingSchema = new mongoose.Schema(
  {
    turfId: { type: mongoose.Schema.Types.ObjectId, ref: "Turf", required: true, index: true },
    // playerId is present for in-app player bookings. Owners can also create "walk-in" bookings.
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, index: true, default: null },
    date: { type: String, required: true }, // YYYY-MM-DD
    timeSlot: { type: String, required: true }, // e.g. "18:00-19:00"
    status: { type: String, enum: BOOKING_STATUS, default: "Pending" },
    bookedForName: { type: String, trim: true, default: "" },
    bookedForPhone: { type: String, trim: true, default: "" },
    // Backward compatible: older records may not have these.
    createdByRole: { type: String, enum: ["Owner", "Player"], required: false, default: "Player" },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, index: true, default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ turfId: 1, date: 1, timeSlot: 1 }, { unique: true });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = { Booking, BOOKING_STATUS };


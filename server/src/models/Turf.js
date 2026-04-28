const mongoose = require("mongoose");

const turfSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    pricePerHour: { type: Number, required: true, min: 0 },
    facilities: [{ type: String, trim: true }],
    images: [{ type: String }],
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

const Turf = mongoose.model("Turf", turfSchema);

module.exports = { Turf };


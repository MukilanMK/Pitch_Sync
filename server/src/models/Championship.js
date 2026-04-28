const mongoose = require("mongoose");

const championshipSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    turfId: { type: mongoose.Schema.Types.ObjectId, ref: "Turf", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    entryFee: { type: Number, default: 0 },
    firstPrize: { type: String, trim: true, default: "" },
    secondPrize: { type: String, trim: true, default: "" },
    thirdPrize: { type: String, trim: true, default: "" },
    minTeams: { type: Number, default: 2 },
    maxTeams: { type: Number, default: 16 },
    status: { type: String, enum: ["Upcoming", "Ongoing", "Completed", "Cancelled"], default: "Upcoming" },
    cancellationReason: { type: String, default: "" },
    registeredTeams: [
      {
        teamName: { type: String, required: true, trim: true },
        captainId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
        registeredAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Championship = mongoose.model("Championship", championshipSchema);

module.exports = { Championship };

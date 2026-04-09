const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    batter: { type: String, trim: true, default: "" }, // striker
    nonStriker: { type: String, trim: true, default: "" },
    bowler: { type: String, trim: true, default: "" },
    runsOffBat: { type: Number, default: 0, min: 0, max: 6 },
    extraType: {
      type: String,
      enum: ["None", "Wide", "NoBall", "Bye", "LegBye", "Penalty"],
      default: "None",
    },
    extraRuns: { type: Number, default: 0, min: 0, max: 10 },
    isWicket: { type: Boolean, default: false }, // kept for backward compat
    wicket: {
      kind: {
        type: String,
        enum: [
          "None",
          "Bowled",
          "Caught",
          "LBW",
          "RunOut",
          "Stumped",
          "HitWicket",
          "ObstructingField",
          "HandledBall",
          "TimedOut",
          "RetiredHurt",
          "RetiredOut",
        ],
        default: "None",
      },
      playerOut: { type: String, trim: true, default: "" },
      fielder: { type: String, trim: true, default: "" },
      assistedBy: [{ type: String, trim: true }],
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const scorecardSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true, index: true },
    totalRuns: { type: Number, default: 0, min: 0 },
    totalWickets: { type: Number, default: 0, min: 0 },
    legalDeliveries: { type: Number, default: 0, min: 0 }, // balls that count in over progression
    striker: { type: String, trim: true, default: "" },
    nonStriker: { type: String, trim: true, default: "" },
    deliveries: [deliverySchema],
  },
  { timestamps: true }
);

const Scorecard = mongoose.model("Scorecard", scorecardSchema);

module.exports = { Scorecard };


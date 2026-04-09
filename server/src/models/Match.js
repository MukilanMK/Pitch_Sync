const mongoose = require("mongoose");

const MATCH_TYPES = ["Turf", "Local"];
const TOSS_DECISIONS = ["Bat", "Bowl"];

const matchDeliverySchema = new mongoose.Schema(
  {
    inningsIndex: { type: Number, required: true, min: 0, max: 1 },
    batterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    nonStrikerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    runsOffBat: { type: Number, default: 0, min: 0, max: 6 },
    extraType: { type: String, enum: ["None", "Wide", "NoBall", "Bye", "LegBye", "Penalty"], default: "None" },
    extraRuns: { type: Number, default: 0, min: 0, max: 10 },
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
      playerOutId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      fielderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    captainId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    wicketKeeperId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const inningsSchema = new mongoose.Schema(
  {
    battingTeam: { type: String, enum: ["A", "B"], required: true },
    bowlingTeam: { type: String, enum: ["A", "B"], required: true },
    totalRuns: { type: Number, default: 0, min: 0 },
    totalWickets: { type: Number, default: 0, min: 0 },
    legalDeliveries: { type: Number, default: 0, min: 0 },
    strikerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    nonStrikerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    currentBowlerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    type: { type: String, enum: MATCH_TYPES, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    oversPerInnings: { type: Number, required: true, min: 1, max: 50 },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    teamA: teamSchema,
    teamB: teamSchema,
    toss: {
      wonBy: { type: String, enum: ["A", "B"], default: null },
      decision: { type: String, enum: TOSS_DECISIONS, default: null },
    },
    innings: { type: [inningsSchema], default: [] },
    deliveries: { type: [matchDeliverySchema], default: [] },
    status: { type: String, enum: ["Setup", "Toss", "Live", "Completed"], default: "Setup" },
  },
  { timestamps: true }
);

const Match = mongoose.model("Match", matchSchema);

module.exports = { Match, MATCH_TYPES, TOSS_DECISIONS };


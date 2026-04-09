const { Scorecard } = require("../models/Scorecard");
const { Booking } = require("../models/Booking");
const { getOverString, applyDeliveryToTotals, computePlayerStatsFromDeliveries, nextStrike } = require("../utils/scorecardMath");

const getOrCreateScorecard = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    let scorecard = await Scorecard.findOne({ bookingId });
    if (!scorecard) {
      scorecard = await Scorecard.create({ bookingId });
    }

    return res.json({
      scorecard: {
        ...scorecard.toObject(),
        totalOvers: getOverString(scorecard.legalDeliveries),
      },
    });
  } catch (err) {
    return next(err);
  }
};

const addDelivery = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const {
      batter = "",
      nonStriker = "",
      bowler = "",
      runsOffBat = 0,
      extraType = "None",
      extraRuns = 0,
      isWicket = false,
      wicket = undefined,
    } = req.body || {};

    let scorecard = await Scorecard.findOne({ bookingId });
    if (!scorecard) {
      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      scorecard = await Scorecard.create({ bookingId });
    }

    const delivery = {
      // Let UI send names initially, then server maintains strike.
      batter: (batter || scorecard.striker || "").trim(),
      nonStriker: (nonStriker || scorecard.nonStriker || "").trim(),
      bowler,
      runsOffBat,
      extraType,
      extraRuns,
      isWicket: Boolean(isWicket) || (wicket?.kind && wicket.kind !== "None"),
      wicket:
        wicket && typeof wicket === "object"
          ? {
              kind: wicket.kind || "None",
              playerOut: wicket.playerOut || "",
              fielder: wicket.fielder || "",
              assistedBy: Array.isArray(wicket.assistedBy) ? wicket.assistedBy : [],
            }
          : undefined,
    };

    // If strike state is missing, initialize from this first scored delivery.
    if (!scorecard.striker && delivery.batter) scorecard.striker = delivery.batter;
    if (!scorecard.nonStriker && delivery.nonStriker) scorecard.nonStriker = delivery.nonStriker;

    const nextTotals = applyDeliveryToTotals(
      {
        totalRuns: scorecard.totalRuns,
        totalWickets: scorecard.totalWickets,
        legalDeliveries: scorecard.legalDeliveries,
      },
      delivery
    );

    const strikeAfter = nextStrike(
      { striker: scorecard.striker, nonStriker: scorecard.nonStriker, legalDeliveries: scorecard.legalDeliveries },
      delivery
    );

    scorecard.deliveries.push(delivery);
    scorecard.totalRuns = nextTotals.totalRuns;
    scorecard.totalWickets = nextTotals.totalWickets;
    scorecard.legalDeliveries = nextTotals.legalDeliveries;
    scorecard.striker = strikeAfter.striker;
    scorecard.nonStriker = strikeAfter.nonStriker;

    await scorecard.save();

    return res.json({
      scorecard: {
        ...scorecard.toObject(),
        totalOvers: nextTotals.totalOvers,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const scorecard = await Scorecard.findOne({ bookingId });
    if (!scorecard) return res.status(404).json({ message: "Scorecard not found" });

    const stats = computePlayerStatsFromDeliveries(scorecard.deliveries || []);
    return res.json({ stats });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getOrCreateScorecard, addDelivery, getStats };


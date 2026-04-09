const mongoose = require("mongoose");
const { Match } = require("../models/Match");
const { Booking } = require("../models/Booking");
const { Turf } = require("../models/Turf");
const { User } = require("../models/User");
const { isLegalBall, overString, nextStrikeIds } = require("../utils/matchMath");

const uniqIds = (arr) => {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    const s = String(x);
    if (!seen.has(s)) {
      seen.add(s);
      out.push(x);
    }
  }
  return out;
};

const ensureUsersExist = async (ids) => {
  const users = await User.find({ _id: { $in: ids } }).select("_id name userId");
  if (users.length !== ids.length) return null;
  return users;
};

const listMine = async (req, res, next) => {
  try {
    const matches = await Match.find({ createdByUserId: req.user.id }).sort({ createdAt: -1 });
    return res.json({ matches });
  } catch (err) {
    return next(err);
  }
};

const createMatch = async (req, res, next) => {
  try {
    const { type, bookingId = null, oversPerInnings, players = [], teamA, teamB } = req.body || {};
    if (!type || !["Turf", "Local"].includes(type)) return res.status(400).json({ message: "type must be Turf or Local" });
    if (!oversPerInnings) return res.status(400).json({ message: "oversPerInnings is required" });

    if (type === "Turf") {
      if (!bookingId) return res.status(400).json({ message: "bookingId is required for Turf matches" });
      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      if (String(booking.playerId) !== String(req.user.id)) return res.status(403).json({ message: "Forbidden" });
      const turf = await Turf.findById(booking.turfId);
      if (!turf) return res.status(404).json({ message: "Turf not found" });
    }

    const ids = uniqIds([req.user.id, ...(players || [])]).map((x) => new mongoose.Types.ObjectId(x));
    const exists = await ensureUsersExist(ids);
    if (!exists) return res.status(400).json({ message: "Invalid players list" });

    const match = await Match.create({
      type,
      bookingId: type === "Turf" ? bookingId : null,
      createdByUserId: req.user.id,
      oversPerInnings: Number(oversPerInnings),
      players: ids,
      teamA: teamA || { name: "Team A", members: [] },
      teamB: teamB || { name: "Team B", members: [] },
      status: "Toss",
    });

    return res.status(201).json({ match });
  } catch (err) {
    return next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate("players", "name userId")
      .populate("teamA.members", "name userId")
      .populate("teamB.members", "name userId")
      .populate("teamA.captainId", "name userId")
      .populate("teamB.captainId", "name userId")
      .populate("teamA.wicketKeeperId", "name userId")
      .populate("teamB.wicketKeeperId", "name userId");
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (String(match.createdByUserId) !== String(req.user.id)) return res.status(403).json({ message: "Forbidden" });
    return res.json({ match });
  } catch (err) {
    return next(err);
  }
};

const setToss = async (req, res, next) => {
  try {
    const { wonBy, decision } = req.body || {};
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (String(match.createdByUserId) !== String(req.user.id)) return res.status(403).json({ message: "Forbidden" });
    if (!["A", "B"].includes(wonBy)) return res.status(400).json({ message: "wonBy must be A or B" });
    if (!["Bat", "Bowl"].includes(decision)) return res.status(400).json({ message: "decision must be Bat or Bowl" });

    match.toss = { wonBy, decision };

    const battingTeam = decision === "Bat" ? wonBy : wonBy === "A" ? "B" : "A";
    const bowlingTeam = battingTeam === "A" ? "B" : "A";
    match.innings = [
      { battingTeam, bowlingTeam, totalRuns: 0, totalWickets: 0, legalDeliveries: 0, completed: false },
      { battingTeam: bowlingTeam, bowlingTeam: battingTeam, totalRuns: 0, totalWickets: 0, legalDeliveries: 0, completed: false },
    ];
    match.status = "Live";

    await match.save();
    return res.json({ match });
  } catch (err) {
    return next(err);
  }
};

const setInningsPlayers = async (req, res, next) => {
  try {
    const { inningsIndex, strikerId, nonStrikerId, bowlerId } = req.body || {};
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (String(match.createdByUserId) !== String(req.user.id)) return res.status(403).json({ message: "Forbidden" });
    const idx = Number(inningsIndex);
    if (![0, 1].includes(idx)) return res.status(400).json({ message: "inningsIndex must be 0 or 1" });
    if (!match.innings?.[idx]) return res.status(400).json({ message: "Innings not initialized. Set toss first." });

    match.innings[idx].strikerId = strikerId;
    match.innings[idx].nonStrikerId = nonStrikerId;
    match.innings[idx].currentBowlerId = bowlerId;
    await match.save();
    return res.json({ match });
  } catch (err) {
    return next(err);
  }
};

const addDelivery = async (req, res, next) => {
  try {
    const { inningsIndex, runsOffBat = 0, extraType = "None", extraRuns = 0, wicket = { kind: "None" }, newBatterId } =
      req.body || {};
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (String(match.createdByUserId) !== String(req.user.id)) return res.status(403).json({ message: "Forbidden" });

    const idx = Number(inningsIndex);
    const inn = match.innings?.[idx];
    if (!inn) return res.status(400).json({ message: "Invalid inningsIndex" });
    if (inn.completed) return res.status(400).json({ message: "Innings is completed" });
    if (!inn.strikerId || !inn.nonStrikerId) return res.status(400).json({ message: "Select striker & non-striker first" });
    if (!inn.currentBowlerId) return res.status(400).json({ message: "Select bowler first" });

    // enforce bowler change at start of each over (except very first ball)
    const atStartOfOver = inn.legalDeliveries > 0 && inn.legalDeliveries % 6 === 0;
    if (atStartOfOver && req.body?.bowlerId && String(req.body.bowlerId) !== String(inn.currentBowlerId)) {
      // allow explicit change
      inn.currentBowlerId = req.body.bowlerId;
    } else if (atStartOfOver && !req.body?.bowlerId) {
      return res.status(400).json({ message: "Bowler must be selected/changed for the new over" });
    }

    const d = {
      inningsIndex: idx,
      batterId: inn.strikerId,
      nonStrikerId: inn.nonStrikerId,
      bowlerId: inn.currentBowlerId,
      runsOffBat,
      extraType,
      extraRuns,
      wicket: wicket && wicket.kind && wicket.kind !== "None" ? wicket : { kind: "None" },
    };

    const isExtra = d.extraType !== "None";
    const extra = isExtra ? Number(d.extraRuns || 0) : 0;
    const bat = Number(d.runsOffBat || 0);
    inn.totalRuns += bat + extra;

    const isWicket = d.wicket?.kind && d.wicket.kind !== "None";
    if (isWicket) inn.totalWickets += 1;

    if (isLegalBall(d)) inn.legalDeliveries += 1;

    match.deliveries.push(d);

    const strikeAfter = nextStrikeIds(
      { strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, legalDeliveries: inn.legalDeliveries - (isLegalBall(d) ? 1 : 0) },
      d
    );
    inn.strikerId = strikeAfter.strikerId;
    inn.nonStrikerId = strikeAfter.nonStrikerId;

    // wicket replacement (simple): if striker got out, require newBatterId
    if (isWicket && String(d.wicket.playerOutId || d.batterId) === String(d.batterId)) {
      if (!newBatterId) return res.status(400).json({ message: "Select new batter for the wicket" });
      inn.strikerId = newBatterId;
    }

    const maxLegal = match.oversPerInnings * 6;
    if (inn.legalDeliveries >= maxLegal) inn.completed = true;
    if (match.innings[0].completed && match.innings[1].completed) match.status = "Completed";

    await match.save();
    return res.json({
      match: {
        ...match.toObject(),
        inningsOver: overString(inn.legalDeliveries),
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listMine, createMatch, getById, setToss, setInningsPlayers, addDelivery };


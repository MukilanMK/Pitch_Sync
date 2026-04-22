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

const normalizeGuestNames = (arr) => {
  const out = [];
  const seen = new Set();
  for (const raw of arr || []) {
    const name = String(raw || "").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
};

const parsePlayerRef = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (value.startsWith("guest:")) {
    const name = value.slice("guest:".length).trim();
    return name ? { id: null, name, key: `guest:${name.toLowerCase()}` } : null;
  }
  return { id: value, name: "", key: value };
};

const participantKey = (id, name) => (id ? String(id) : `guest:${String(name || "").trim().toLowerCase()}`);

const applyParticipant = (inn, field, value) => {
  if (field === "striker") {
    inn.strikerId = value.id || null;
    inn.strikerName = value.id ? "" : value.name;
  } else if (field === "nonStriker") {
    inn.nonStrikerId = value.id || null;
    inn.nonStrikerName = value.id ? "" : value.name;
  } else if (field === "bowler") {
    inn.currentBowlerId = value.id || null;
    inn.currentBowlerName = value.id ? "" : value.name;
  }
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
      teamA: {
        name: teamA?.name || "Team A",
        members: teamA?.members || [],
        guestMembers: normalizeGuestNames(teamA?.guestMembers),
        captainId: teamA?.captainId || null,
        captainName: teamA?.captainName || "",
        wicketKeeperId: teamA?.wicketKeeperId || null,
        wicketKeeperName: teamA?.wicketKeeperName || "",
      },
      teamB: {
        name: teamB?.name || "Team B",
        members: teamB?.members || [],
        guestMembers: normalizeGuestNames(teamB?.guestMembers),
        captainId: teamB?.captainId || null,
        captainName: teamB?.captainName || "",
        wicketKeeperId: teamB?.wicketKeeperId || null,
        wicketKeeperName: teamB?.wicketKeeperName || "",
      },
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

    const inn = match.innings[idx];
    const battingTeam = inn.battingTeam === "A" ? match.teamA : match.teamB;
    const bowlingTeam = inn.bowlingTeam === "A" ? match.teamA : match.teamB;
    const battingUserIds = new Set((battingTeam?.members || []).map((x) => String(x)));
    const bowlingUserIds = new Set((bowlingTeam?.members || []).map((x) => String(x)));
    const battingGuests = new Set((battingTeam?.guestMembers || []).map((x) => `guest:${String(x).trim().toLowerCase()}`));
    const bowlingGuests = new Set((bowlingTeam?.guestMembers || []).map((x) => `guest:${String(x).trim().toLowerCase()}`));

    const striker = parsePlayerRef(strikerId);
    const nonStriker = parsePlayerRef(nonStrikerId);
    const bowler = parsePlayerRef(bowlerId);
    if (!striker || !nonStriker || !bowler) return res.status(400).json({ message: "Select striker, non-striker and bowler" });

    if (!(battingUserIds.has(striker.key) || battingGuests.has(striker.key))) {
      return res.status(400).json({ message: "Striker is not in batting team" });
    }
    if (!(battingUserIds.has(nonStriker.key) || battingGuests.has(nonStriker.key))) {
      return res.status(400).json({ message: "Non-striker is not in batting team" });
    }
    if (!(bowlingUserIds.has(bowler.key) || bowlingGuests.has(bowler.key))) {
      return res.status(400).json({ message: "Bowler is not in bowling team" });
    }

    applyParticipant(inn, "striker", striker);
    applyParticipant(inn, "nonStriker", nonStriker);
    applyParticipant(inn, "bowler", bowler);
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
    if ((!inn.strikerId && !inn.strikerName) || (!inn.nonStrikerId && !inn.nonStrikerName)) {
      return res.status(400).json({ message: "Select striker & non-striker first" });
    }
    if (!inn.currentBowlerId && !inn.currentBowlerName) return res.status(400).json({ message: "Select bowler first" });

    // enforce bowler change at start of each over (except very first ball)
    const atStartOfOver = inn.legalDeliveries > 0 && inn.legalDeliveries % 6 === 0;
    if (atStartOfOver && req.body?.bowlerId) {
      const nextBowler = parsePlayerRef(req.body.bowlerId);
      if (!nextBowler) return res.status(400).json({ message: "Invalid bowler selection" });
      applyParticipant(inn, "bowler", nextBowler);
    } else if (atStartOfOver && !req.body?.bowlerId) {
      return res.status(400).json({ message: "Bowler must be selected/changed for the new over" });
    }

    let finalWicket = { kind: "None" };
    if (wicket && wicket.kind && wicket.kind !== "None") {
      const pOut = parsePlayerRef(wicket.playerOutId);
      const fld = parsePlayerRef(wicket.fielderId);
      finalWicket = {
        kind: wicket.kind,
        playerOutId: pOut?.id || null,
        playerOutName: pOut?.id ? "" : pOut?.name || "",
        fielderId: fld?.id || null,
        fielderName: fld?.id ? "" : fld?.name || "",
      };
    }

    const d = {
      inningsIndex: idx,
      batterId: inn.strikerId || null,
      batterName: inn.strikerId ? "" : inn.strikerName || "",
      nonStrikerId: inn.nonStrikerId || null,
      nonStrikerName: inn.nonStrikerId ? "" : inn.nonStrikerName || "",
      bowlerId: inn.currentBowlerId || null,
      bowlerName: inn.currentBowlerId ? "" : inn.currentBowlerName || "",
      runsOffBat,
      extraType,
      extraRuns,
      wicket: finalWicket,
    };

    const isExtra = d.extraType !== "None";
    const extra = isExtra ? Number(d.extraRuns || 0) : 0;
    const bat = Number(d.runsOffBat || 0);
    inn.totalRuns += bat + extra;

    const isWicket = d.wicket?.kind && d.wicket.kind !== "None";
    if (isWicket) inn.totalWickets += 1;

    if (isLegalBall(d)) inn.legalDeliveries += 1;

    match.deliveries.push(d);

    const strikerKeyBefore = participantKey(inn.strikerId, inn.strikerName);
    const nonStrikerKeyBefore = participantKey(inn.nonStrikerId, inn.nonStrikerName);
    const strikeAfter = nextStrikeIds(
      { strikerId: strikerKeyBefore, nonStrikerId: nonStrikerKeyBefore, legalDeliveries: inn.legalDeliveries - (isLegalBall(d) ? 1 : 0) },
      d
    );
    if (strikeAfter.strikerId === strikerKeyBefore) {
      inn.strikerId = d.batterId || null;
      inn.strikerName = d.batterId ? "" : d.batterName || "";
    } else {
      inn.strikerId = d.nonStrikerId || null;
      inn.strikerName = d.nonStrikerId ? "" : d.nonStrikerName || "";
    }
    if (strikeAfter.nonStrikerId === strikerKeyBefore) {
      inn.nonStrikerId = d.batterId || null;
      inn.nonStrikerName = d.batterId ? "" : d.batterName || "";
    } else {
      inn.nonStrikerId = d.nonStrikerId || null;
      inn.nonStrikerName = d.nonStrikerId ? "" : d.nonStrikerName || "";
    }

    // wicket replacement (simple): if striker got out, require newBatterId
    const outId = d.wicket.playerOutId ? String(d.wicket.playerOutId) : d.batterId ? String(d.batterId) : "";
    const batterId = d.batterId ? String(d.batterId) : "";
    if (isWicket && outId && batterId && outId === batterId) {
      if (!newBatterId) return res.status(400).json({ message: "Select new batter for the wicket" });
      const nextBatter = parsePlayerRef(newBatterId);
      if (!nextBatter) return res.status(400).json({ message: "Invalid new batter" });
      applyParticipant(inn, "striker", nextBatter);
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

const undoDelivery = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (String(match.createdByUserId) !== String(req.user.id)) return res.status(403).json({ message: "Forbidden" });

    if (!match.deliveries || match.deliveries.length === 0) {
      return res.status(400).json({ message: "No deliveries to undo" });
    }

    const d = match.deliveries.pop();
    const inn = match.innings?.[d.inningsIndex];

    if (inn) {
      const isExtra = d.extraType !== "None";
      const extra = isExtra ? Number(d.extraRuns || 0) : 0;
      const bat = Number(d.runsOffBat || 0);
      inn.totalRuns -= (bat + extra);

      const isWicket = d.wicket?.kind && d.wicket.kind !== "None";
      if (isWicket) inn.totalWickets -= 1;

      if (isLegalBall(d)) inn.legalDeliveries -= 1;

      inn.completed = false;
      match.status = "Live";

      inn.strikerId = d.batterId || null;
      inn.strikerName = d.batterId ? "" : d.batterName || "";
      inn.nonStrikerId = d.nonStrikerId || null;
      inn.nonStrikerName = d.nonStrikerId ? "" : d.nonStrikerName || "";
      inn.currentBowlerId = d.bowlerId || null;
      inn.currentBowlerName = d.bowlerId ? "" : d.bowlerName || "";
    }

    await match.save();
    return res.json({
      match: {
        ...match.toObject(),
        inningsOver: inn ? overString(inn.legalDeliveries) : "0.0",
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listMine, createMatch, getById, setToss, setInningsPlayers, addDelivery, undoDelivery };


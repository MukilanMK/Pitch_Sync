const { Championship } = require("../models/Championship");
const { Match } = require("../models/Match");
const { Turf } = require("../models/Turf");
const mongoose = require("mongoose");

const create = async (req, res, next) => {
  try {
    const { name, turfId, startDate, endDate, entryFee, minTeams, maxTeams, firstPrize, secondPrize, thirdPrize } = req.body;
    
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    
    if (startDate < todayStr) {
      return res.status(400).json({ message: "Start date cannot be in the past" });
    }
    if (endDate < startDate) {
      return res.status(400).json({ message: "End date must be on or after start date" });
    }

    const turf = await Turf.findById(turfId);
    if (!turf) return res.status(404).json({ message: "Turf not found" });
    if (String(turf.ownerId) !== String(req.user.id)) return res.status(403).json({ message: "Forbidden" });

    const championship = await Championship.create({
      name,
      turfId,
      ownerId: req.user.id,
      startDate,
      endDate,
      entryFee: Number(entryFee) || 0,
      minTeams: Number(minTeams) || 2,
      maxTeams: Number(maxTeams) || 16,
      firstPrize,
      secondPrize,
      thirdPrize,
      status: "Upcoming",
    });

    return res.status(201).json({ championship });
  } catch (err) {
    return next(err);
  }
};

const listOwner = async (req, res, next) => {
  try {
    const championships = await Championship.find({ ownerId: req.user.id })
      .populate("turfId", "name location")
      .sort({ createdAt: -1 });
    return res.json({ championships });
  } catch (err) {
    return next(err);
  }
};

const listAll = async (req, res, next) => {
  try {
    const championships = await Championship.find()
      .populate("turfId", "name location")
      .populate("ownerId", "name")
      .sort({ createdAt: -1 });
    return res.json({ championships });
  } catch (err) {
    return next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const championship = await Championship.findById(req.params.id)
      .populate("turfId", "name location")
      .populate("ownerId", "name")
      .populate("registeredTeams.captainId", "name userId")
      .populate("registeredTeams.players", "name userId");

    if (!championship) return res.status(404).json({ message: "Championship not found" });

    // Also fetch matches for this championship
    const matches = await Match.find({ championshipId: championship._id })
      .select("teamA teamB toss status createdAt oversPerInnings innings")
      .sort({ createdAt: -1 });

    return res.json({ championship, matches });
  } catch (err) {
    return next(err);
  }
};

const registerTeam = async (req, res, next) => {
  try {
    const { teamName, playerIds } = req.body; // array of user object ids
    if (!teamName) return res.status(400).json({ message: "Team name is required" });
    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
       return res.status(400).json({ message: "At least one player is required" });
    }

    const championship = await Championship.findById(req.params.id);
    if (!championship) return res.status(404).json({ message: "Championship not found" });
    if (championship.status === "Completed") return res.status(400).json({ message: "Championship is already completed" });
    if (championship.status === "Cancelled") return res.status(400).json({ message: "Championship is cancelled" });
    if (championship.maxTeams > 0 && championship.registeredTeams.length >= championship.maxTeams) {
      return res.status(400).json({ message: "Championship has reached the maximum number of teams" });
    }

    // Include captain in players
    const playersSet = new Set(playerIds.map(id => String(id)));
    playersSet.add(String(req.user.id));
    const playersArr = Array.from(playersSet);

    // Enforce exclusivity
    const allRegisteredPlayers = championship.registeredTeams.flatMap(t => t.players.map(p => String(p)));
    const duplicatePlayers = playersArr.filter(p => allRegisteredPlayers.includes(p));
    if (duplicatePlayers.length > 0) {
      return res.status(400).json({ message: "One or more players are already part of another team in this championship." });
    }

    championship.registeredTeams.push({
      teamName,
      captainId: req.user.id,
      players: playersArr,
      status: "Pending",
    });

    await championship.save();
    return res.json({ message: "Registration successful. Waiting for approval." });
  } catch (err) {
    return next(err);
  }
};

const approveTeam = async (req, res, next) => {
  try {
    const { teamId, status } = req.body;
    if (!["Approved", "Rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });

    const championship = await Championship.findById(req.params.id);
    if (!championship) return res.status(404).json({ message: "Championship not found" });
    if (String(championship.ownerId) !== String(req.user.id)) return res.status(403).json({ message: "Forbidden" });

    const team = championship.registeredTeams.id(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    team.status = status;
    await championship.save();
    return res.json({ message: `Team ${status.toLowerCase()}` });
  } catch (err) {
    return next(err);
  }
};

const createMatch = async (req, res, next) => {
  try {
    const { teamAId, teamBId, oversPerInnings, scheduledDate, timeSlot } = req.body;
    
    if (!oversPerInnings) return res.status(400).json({ message: "Overs per innings is required" });
    if (!scheduledDate || !timeSlot) return res.status(400).json({ message: "Scheduled date and time slot are required" });
    if (!teamAId || !teamBId || teamAId === teamBId) return res.status(400).json({ message: "Select two distinct teams" });

    const championship = await Championship.findById(req.params.id);
    if (!championship) return res.status(404).json({ message: "Championship not found" });
    if (String(championship.ownerId) !== String(req.user.id)) return res.status(403).json({ message: "Forbidden" });

    const teamA = championship.registeredTeams.id(teamAId);
    const teamB = championship.registeredTeams.id(teamBId);

    if (!teamA || !teamB) return res.status(400).json({ message: "Invalid teams selected" });
    if (teamA.status !== "Approved" || teamB.status !== "Approved") {
      return res.status(400).json({ message: "Both teams must be approved" });
    }

    // Collect all players involved for the match model
    const playersSet = new Set([...teamA.players, ...teamB.players].map(id => String(id)));

    const match = await Match.create({
      type: "Championship",
      championshipId: championship._id,
      createdByUserId: req.user.id,
      oversPerInnings: Number(oversPerInnings),
      players: Array.from(playersSet),
      teamA: {
        name: teamA.teamName,
        members: teamA.players,
        captainId: teamA.captainId,
      },
      teamB: {
        name: teamB.teamName,
        members: teamB.players,
        captainId: teamB.captainId,
      },
      scheduledDate,
      timeSlot,
      status: "PendingAcceptance",
    });

    if (championship.status === "Upcoming") {
      championship.status = "Ongoing";
      await championship.save();
    }

    return res.status(201).json({ match });
  } catch (err) {
    return next(err);
  }
};

const cancelChampionship = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const championship = await Championship.findById(req.params.id);
    if (!championship) return res.status(404).json({ message: "Championship not found" });
    if (String(championship.ownerId) !== String(req.user.id)) return res.status(403).json({ message: "Forbidden" });

    if (championship.status === "Completed") return res.status(400).json({ message: "Championship is already completed" });

    championship.status = "Cancelled";
    championship.cancellationReason = reason || "Cancelled by owner";
    await championship.save();

    return res.json({ message: "Championship cancelled successfully" });
  } catch (err) {
    return next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const { minTeams, maxTeams } = req.body;
    const championship = await Championship.findById(req.params.id);
    if (!championship) return res.status(404).json({ message: "Championship not found" });
    if (String(championship.ownerId) !== String(req.user.id)) return res.status(403).json({ message: "Forbidden" });

    if (minTeams) championship.minTeams = Number(minTeams);
    if (maxTeams) championship.maxTeams = Number(maxTeams);

    await championship.save();
    return res.json({ message: "Settings updated successfully", championship });
  } catch (err) {
    return next(err);
  }
};

module.exports = { create, listOwner, listAll, getById, registerTeam, approveTeam, createMatch, cancelChampionship, updateSettings };

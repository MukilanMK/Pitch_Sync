const { Turf } = require("../models/Turf");

const createTurf = async (req, res, next) => {
  try {
    const { name, location, pricePerHour, facilities } = req.body;
    if (!name || !location || pricePerHour === undefined) {
      return res.status(400).json({ message: "name, location, pricePerHour are required" });
    }

    const turf = await Turf.create({
      name,
      location,
      pricePerHour,
      facilities: Array.isArray(facilities) ? facilities : [],
      ownerId: req.user.id,
    });

    return res.status(201).json({ turf });
  } catch (err) {
    return next(err);
  }
};

const listTurfs = async (req, res, next) => {
  try {
    const turfs = await Turf.find().sort({ createdAt: -1 }).populate("ownerId", "name email role");
    return res.json({ turfs });
  } catch (err) {
    return next(err);
  }
};

const getTurfById = async (req, res, next) => {
  try {
    const turf = await Turf.findById(req.params.id).populate("ownerId", "name email role");
    if (!turf) return res.status(404).json({ message: "Turf not found" });
    return res.json({ turf });
  } catch (err) {
    return next(err);
  }
};

const listMyTurfs = async (req, res, next) => {
  try {
    const turfs = await Turf.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    return res.json({ turfs });
  } catch (err) {
    return next(err);
  }
};

module.exports = { createTurf, listTurfs, getTurfById, listMyTurfs };


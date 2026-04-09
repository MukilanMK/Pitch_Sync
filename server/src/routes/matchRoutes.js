const express = require("express");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { listMine, createMatch, getById, setToss, setInningsPlayers, addDelivery } = require("../controllers/matchController");

const router = express.Router();

router.get("/mine", auth, requireRole("Player"), listMine);
router.post("/", auth, requireRole("Player"), createMatch);
router.get("/:id", auth, requireRole("Player"), getById);
router.post("/:id/toss", auth, requireRole("Player"), setToss);
router.post("/:id/innings/setup", auth, requireRole("Player"), setInningsPlayers);
router.post("/:id/deliveries", auth, requireRole("Player"), addDelivery);

module.exports = router;


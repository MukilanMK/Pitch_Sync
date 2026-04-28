const express = require("express");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { listMine, createMatch, getById, setToss, setInningsPlayers, addDelivery, undoDelivery, handleScheduling, listInvitations } = require("../controllers/matchController");

const router = express.Router();

router.get("/mine", auth, requireRole("Player"), listMine);
router.get("/invitations", auth, requireRole("Player"), listInvitations);
router.post("/", auth, requireRole("Player"), createMatch);
router.get("/:id", auth, requireRole("Player", "Owner"), getById);
router.post("/:id/toss", auth, requireRole("Player", "Owner"), setToss);
router.post("/:id/innings/setup", auth, requireRole("Player", "Owner"), setInningsPlayers);
router.post("/:id/deliveries", auth, requireRole("Player", "Owner"), addDelivery);
router.post("/:id/deliveries/undo", auth, requireRole("Player", "Owner"), undoDelivery);
router.patch("/:id/scheduling", auth, handleScheduling);

module.exports = router;


const express = require("express");
const router = express.Router();
const championshipController = require("../controllers/championshipController");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");

// Public (or just logged in users) can view championships
router.get("/", auth, championshipController.listAll);
router.get("/:id", auth, championshipController.getById);

// Players can register
router.post("/:id/register", auth, requireRole("Player", "Owner"), championshipController.registerTeam);

// Owner routes
router.get("/owner/me", auth, requireRole("Owner"), championshipController.listOwner);
router.post("/", auth, requireRole("Owner"), championshipController.create);
router.patch("/:id/approve", auth, requireRole("Owner"), championshipController.approveTeam);
router.post("/:id/matches", auth, requireRole("Owner"), championshipController.createMatch);
router.patch("/:id/cancel", auth, requireRole("Owner"), championshipController.cancelChampionship);
router.patch("/:id/settings", auth, requireRole("Owner"), championshipController.updateSettings);

module.exports = router;

const express = require("express");
const { createTurf, listTurfs, getTurfById, listMyTurfs } = require("../controllers/turfController");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

router.get("/", listTurfs);

router.post("/", auth, requireRole("Owner"), createTurf);
router.get("/mine/list", auth, requireRole("Owner"), listMyTurfs);

router.get("/:id", getTurfById);

module.exports = router;


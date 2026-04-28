const express = require("express");
const { createTurf, listTurfs, getTurfById, listMyTurfs } = require("../controllers/turfController");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { upload } = require("../middleware/upload");

const router = express.Router();

router.get("/", listTurfs);

router.post("/", auth, requireRole("Owner"), upload.array("images", 5), createTurf);
router.get("/mine/list", auth, requireRole("Owner"), listMyTurfs);

router.get("/:id", getTurfById);

module.exports = router;


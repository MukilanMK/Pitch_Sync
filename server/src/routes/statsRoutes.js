const express = require("express");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { getMyStats } = require("../controllers/statsController");

const router = express.Router();

router.get("/me", auth, requireRole("Player"), getMyStats);

module.exports = router;


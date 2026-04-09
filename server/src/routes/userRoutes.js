const express = require("express");
const { auth } = require("../middleware/auth");
const { resolveUserIds } = require("../controllers/userController");

const router = express.Router();

router.post("/resolve", auth, resolveUserIds);

module.exports = router;


const express = require("express");
const { auth } = require("../middleware/auth");
const { listFriends, addFriendByUserId, removeFriend } = require("../controllers/friendController");

const router = express.Router();

router.get("/", auth, listFriends);
router.post("/", auth, addFriendByUserId);
router.delete("/:friendId", auth, removeFriend);

module.exports = router;


const { User } = require("../models/User");

const normalizeUserId = (raw) => {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
};

const listFriends = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id).populate("friends", "name userId email role");
    if (!me) return res.status(404).json({ message: "User not found" });
    return res.json({ friends: me.friends || [] });
  } catch (err) {
    return next(err);
  }
};

const addFriendByUserId = async (req, res, next) => {
  try {
    const { userId } = req.body || {};
    const norm = normalizeUserId(userId);
    if (!norm) return res.status(400).json({ message: "userId is required" });

    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    if (me.userId === norm) return res.status(400).json({ message: "You cannot add yourself" });

    const other = await User.findOne({ userId: norm }).select("_id name userId email role");
    if (!other) return res.status(404).json({ message: "UserId not found" });

    const meHas = (me.friends || []).some((id) => String(id) === String(other._id));
    if (!meHas) me.friends.push(other._id);
    await me.save();

    // make it mutual
    const otherDoc = await User.findById(other._id);
    const otherHas = (otherDoc.friends || []).some((id) => String(id) === String(me._id));
    if (!otherHas) {
      otherDoc.friends.push(me._id);
      await otherDoc.save();
    }

    return res.status(201).json({ friend: other });
  } catch (err) {
    return next(err);
  }
};

const removeFriend = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    me.friends = (me.friends || []).filter((id) => String(id) !== String(friendId));
    await me.save();

    const other = await User.findById(friendId);
    if (other) {
      other.friends = (other.friends || []).filter((id) => String(id) !== String(me._id));
      await other.save();
    }

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listFriends, addFriendByUserId, removeFriend };


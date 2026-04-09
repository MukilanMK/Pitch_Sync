const { User } = require("../models/User");

const normalizeUserId = (raw) => {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
};

const resolveUserIds = async (req, res, next) => {
  try {
    const { userIds } = req.body || {};
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds array is required" });
    }

    const normalized = userIds.map(normalizeUserId).filter(Boolean);
    if (normalized.length === 0) return res.status(400).json({ message: "No valid userIds provided" });

    const users = await User.find({ userId: { $in: normalized } }).select("_id name userId");
    const found = new Set(users.map((u) => u.userId));
    const missing = normalized.filter((x) => !found.has(x));

    return res.json({ users, missing });
  } catch (err) {
    return next(err);
  }
};

module.exports = { resolveUserIds };


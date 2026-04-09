const { User, USER_ROLES } = require("../models/User");
const { signToken } = require("../utils/jwt");

const normalizeUserId = (raw) => {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
};

const register = async (req, res, next) => {
  try {
    const { name, userId, email, password, role } = req.body;

    if (!name || !userId || !email || !password || !role) {
      return res.status(400).json({ message: "name, userId, email, password, role are required" });
    }
    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const normUserId = normalizeUserId(userId);
    if (!normUserId || normUserId.length < 3) {
      return res.status(400).json({ message: "userId must be at least 3 characters (a-z, 0-9, underscore)" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const existingUserId = await User.findOne({ userId: normUserId });
    if (existingUserId) {
      return res.status(409).json({ message: "userId already in use" });
    }

    const user = await User.create({ name, userId: normUserId, email, password, role });
    const token = signToken(user);

    return res.status(201).json({ token, user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    return res.json({ token, user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
};

module.exports = { register, login, me };


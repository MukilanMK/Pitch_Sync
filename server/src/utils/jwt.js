const jwt = require("jsonwebtoken");

const signToken = (user) => {
  const payload = {
    id: user._id.toString(),
    role: user.role,
    name: user.name,
    email: user.email,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = { signToken };


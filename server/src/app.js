const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { notFoundHandler, errorHandler } = require("./middleware/errorHandlers");

const authRoutes = require("./routes/authRoutes");
const turfRoutes = require("./routes/turfRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const scorecardRoutes = require("./routes/scorecardRoutes");
const friendRoutes = require("./routes/friendRoutes");
const matchRoutes = require("./routes/matchRoutes");
const statsRoutes = require("./routes/statsRoutes");
const userRoutes = require("./routes/userRoutes");

const createApp = ({ clientOrigin }) => {
  const app = express();

  app.use(
    cors({
      origin: clientOrigin || true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, name: "PitchSync API" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/turfs", turfRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/scorecards", scorecardRoutes);
  app.use("/api/friends", friendRoutes);
  app.use("/api/matches", matchRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/users", userRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = { createApp };


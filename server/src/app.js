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

  const allowedOrigins = clientOrigin ? clientOrigin.split(',').map(o => o.trim()) : true;
  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin || allowedOrigins === true || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else if (origin.startsWith('http://localhost:')) {
          // allow any localhost port in development
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/", (req, res) => {
    res.redirect(302, "/api/health");
  });
  app.head("/", (req, res) => {
    res.status(204).end();
  });

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


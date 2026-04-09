require("dotenv").config();

const { connectDB } = require("./config/db");
const { createApp } = require("./app");

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB(process.env.MONGO_URI);

  const app = createApp({ clientOrigin: process.env.CLIENT_ORIGIN });
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`PitchSync API running on http://localhost:${PORT}`);
  });
};

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", err);
  process.exit(1);
});


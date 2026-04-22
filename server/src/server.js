// On Render, `RENDER` is set — use dashboard env only so a committed `.env` cannot override CORS/secrets.
if (process.env.RENDER !== "true") {
  require("dotenv").config();
}

const { connectDB } = require("./config/db");
const { createApp } = require("./app");

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB(process.env.MONGO_URI);

  const app = createApp({ clientOrigin: process.env.CLIENT_ORIGIN });
  app.listen(PORT, () => {
    const renderUrl =
      process.env.RENDER_EXTERNAL_URL ||
      (process.env.RENDER_EXTERNAL_HOSTNAME
        ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
        : null);
    // eslint-disable-next-line no-console
    console.log(
      process.env.RENDER === "true" && renderUrl
        ? `PitchSync API listening — ${renderUrl}`
        : `PitchSync API listening on http://127.0.0.1:${PORT}`
    );
  });
};

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", err);
  process.exit(1);
});


const mongoose = require("mongoose");

const connectDB = async (mongoUri) => {
  try {
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing");
    }

    mongoose.set("strictQuery", true);
    const conn = await mongoose.connect(mongoUri);
    return conn;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("MongoDB connection error:", err.message);
    throw err;
  }
};

module.exports = { connectDB };


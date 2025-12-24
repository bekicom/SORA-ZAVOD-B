// config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const MONGO_URI =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sora_zavod";

    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB (Compass) ulandi");
  } catch (err) {
    console.error("❌ MongoDB ulanish xatosi:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
// 
// models/GlobalSyncQueue.js
const mongoose = require("mongoose");

const GlobalSyncQueueSchema = new mongoose.Schema(
  {
    name: String,
    birlik: String,
    category: String,
    qty: Number,

    source: {
      type: String,
      enum: ["WAREHOUSE", "MAIN_WAREHOUSE", "UNIT"],
    },

    status: {
      type: String,
      enum: ["pending", "done", "error"],
      default: "pending",
    },

    error: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("GlobalSyncQueue", GlobalSyncQueueSchema);

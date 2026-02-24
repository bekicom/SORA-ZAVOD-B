// models/GlobalSyncQueue.js
const mongoose = require("mongoose");

const GlobalSyncQueueSchema = new mongoose.Schema(
  {
    name: String,
    birlik: String,
    category: String,
    qty: Number,
    price: Number,
    product_type: {
      type: String,
      enum: ["tayyor", "yarim_tayyor"],
    },

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
    retry_count: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("GlobalSyncQueue", GlobalSyncQueueSchema);

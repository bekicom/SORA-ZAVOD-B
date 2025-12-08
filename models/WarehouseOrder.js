// models/WarehouseOrder.js
const mongoose = require("mongoose");

const WarehouseOrderSchema = new mongoose.Schema(
  {
    unit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    kategoriya_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      required: true,
    },
    kategoriya_nomi: { type: String },
    quantity: { type: Number, required: true },

    recipe_items: [
      {
        nom: String,
        birlik: String,
        bazaviy_miqdor: Number,
        umumiy_miqdor: Number,
        yigilgan_miqdor: { type: Number, default: 0 },
        ombor_joylashuvi: { type: String, default: "" },
      },
    ],

    requested_by: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "confirmed", "completed", "cancelled"],
      default: "pending",
    },

    approved_by: { type: String },
    collected_by: { type: String },
    completed_at: { type: Date },

    // 🆕 Unit tomonidan qabul qilinganligini belgilash
    unit_received: {
      type: Boolean,
      default: false,
    },
    received_by: {
      type: String,
      default: null,
    },
    received_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("WarehouseOrder", WarehouseOrderSchema);

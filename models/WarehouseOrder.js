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
        yigilgan_miqdor: { type: Number, default: 0 }, // ✅ YANGI: yig'ilgan miqdor
        ombor_joylashuvi: { type: String, default: "" }, // ✅ YANGI: qaysi ombordan
      },
    ],
    requested_by: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "confirmed", "completed", "cancelled"], // ✅ YANGILANDI!
      default: "pending",
    },
    approved_by: { type: String },
    collected_by: { type: String }, // ✅ YANGI: kim yig'di
    completed_at: { type: Date }, // ✅ YANGI: yakunlangan vaqt
  },
  { timestamps: true }
);

module.exports = mongoose.model("WarehouseOrder", WarehouseOrderSchema);

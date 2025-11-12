const mongoose = require("mongoose");

const UnitRequestSchema = new mongoose.Schema(
  {
    from_unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    }, // kim so‘radi
    to_unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    }, // kim beradi
    kategoriya_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    kategoriya_nomi: { type: String, required: true },
    miqdor: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "received"], // ✅ YANGI qiymat qo‘shildi
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UnitRequest", UnitRequestSchema);

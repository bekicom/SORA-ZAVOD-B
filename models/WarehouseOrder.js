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
    quantity: { type: Number, required: true }, // nechta tayyor mahsulot uchun zakas
    recipe_items: [
      {
        nom: String, // ingredient nomi
        birlik: String, // o‘lchov birligi (g, kg, l, ml ...)
        bazaviy_miqdor: Number, // tex kartadagi miqdor
        umumiy_miqdor: Number, // zakasga qarab hisoblangan miqdor
      },
    ],
    requested_by: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "sent", "completed"],
      default: "pending",
    },
    approved_by: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WarehouseOrder", WarehouseOrderSchema);

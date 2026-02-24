// models/WarehouseRoom.js
const mongoose = require("mongoose");

const WarehouseRoomSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },

    mahsulotlar: [
      {
        product_code: { type: String, index: true }, // masalan: TORT_QULPUNAY
        nom: { type: String, required: true },
        turi: {
          type: String,
          enum: ["tayyor", "yarim_tayyor"],
          default: "yarim_tayyor",
        },
        miqdor: { type: Number, default: 0 },
        birlik: { type: String, default: "dona" },
        price: { type: Number, default: 0, min: 0 },
        kirim_sana: { type: Date, default: Date.now },
        oxirgi_ozgarish: { type: Date, default: Date.now },
      },
    ],

    // 🔹 Kirim tarixi
    kirimlar: [
      {
        mahsulot: String,
        miqdor: Number,
        birlik: String,
        izoh: { type: String, default: "Omborga kirim" },
        sana: { type: Date, default: Date.now },
      },
    ],

    // 🔹 Chiqim tarixi
    chiqimlar: [
      {
        mahsulot: String,
        miqdor: Number,
        izoh: { type: String, default: "Ishlab chiqarish uchun chiqim" },
        sana: { type: Date, default: Date.now },
      },
    ],

    status: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("WarehouseRoom", WarehouseRoomSchema);

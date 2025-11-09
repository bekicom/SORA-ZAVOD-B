const mongoose = require("mongoose");

const MainWarehouseSchema = new mongoose.Schema(
  {
    // 🔹 Mahsulot nomi
    kategoriya_nomi: {
      type: String,
      required: true,
      trim: true,
    },

    // 🔹 Qaysi unitdan keldi
    unit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },

    // 🔹 Qaysi kategoriya (unit ichidagi mahsulot)
    kategoriya_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // 🔹 Miqdor (nechta dona, kg, litr va h.k.)
    miqdor: {
      type: Number,
      required: true,
      default: 0,
    },

    // 🔹 Birlik (masalan: dona, kg, litr)
    birlik: {
      type: String,
      default: "dona",
    },

    // 🔹 Oxirgi kirim sanasi
    last_kirim_date: {
      type: Date,
      default: Date.now,
    },

    // 🔹 Kirimlar tarixi (log)
    kirim_tarix: [
      {
        unit_nomi: String,
        miqdor: Number,
        sana: { type: Date, default: Date.now },
        kiritgan: String, // kim kiritdi (admin)
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("MainWarehouse", MainWarehouseSchema);

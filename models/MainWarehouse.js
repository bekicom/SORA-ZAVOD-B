const mongoose = require("mongoose");

const MainWarehouseSchema = new mongoose.Schema(
  {
    // 🔗 Global katalog mahsuloti
    global_product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GlobalProduct",
      required: true,
      index: true,
    },

    // 🏭 Qaysi unit ishlab chiqargan
    unit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },

    // 📦 Miqdor
    miqdor: {
      type: Number,
      default: 0,
      min: 0,
    },

    birlik: {
      type: String,
      default: "dona",
    },

    // 🧾 Kirim tarixi
    kirim_tarix: [
      {
        miqdor: Number,
        kiritgan: String,
        sana: { type: Date, default: Date.now },
        note: String,
      },
    ],
  },
  { timestamps: true },
);

// 🔐 bitta global product + bitta unit = bitta qator
MainWarehouseSchema.index(
  { global_product_id: 1, unit_id: 1 },
  { unique: true },
);

module.exports = mongoose.model("MainWarehouse", MainWarehouseSchema);

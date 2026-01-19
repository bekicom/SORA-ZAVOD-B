const mongoose = require("mongoose");

const MainWarehouseSchema = new mongoose.Schema(
  {
    /* =========================
       🔗 GLOBAL PRODUCT (ASOSIY)
    ========================= */
    global_product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GlobalProduct",
      required: true,
    },

    /* =========================
       🏭 UNIT (ZAVOD BO‘LIMI)
    ========================= */
    unit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },

 
    kategoriya_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kategoriya",
      required: true, // 🔥 zavod logikasi uchun majburiy
    },

    kategoriya_nomi: {
      type: String,
      required: true,
      trim: true,
    },

    /* =========================
       📦 MIQDOR
    ========================= */
    miqdor: {
      type: Number,
      default: 0,
      min: 0,
    },

    birlik: {
      type: String,
      default: "dona",
    },

    /* =========================
       🧾 KIRIM TARIXI
    ========================= */
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

/* =========================
   🔐 UNIQUE QOIDA
   Bitta global product + bitta unit + bitta kategoriya
========================= */
MainWarehouseSchema.index(
  {
    global_product_id: 1,
    unit_id: 1,
    kategoriya_id: 1,
  },
  { unique: true },
);

module.exports = mongoose.model("MainWarehouse", MainWarehouseSchema);

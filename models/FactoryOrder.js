const mongoose = require("mongoose");

/* =========================
   📦 ORDER ITEM
========================= */
const FactoryOrderItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    product_name: {
      type: String,
      required: true,
      trim: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 1,
    },

    unit: {
      type: String,
      default: "dona",
    },
  },
  { _id: false },
);

/* =========================
   🧾 FACTORY ORDER
========================= */
const FactoryOrderSchema = new mongoose.Schema(
  {
    shop_name: {
      type: String,
      required: true,
      trim: true,
    },

    items: {
      type: [FactoryOrderItemSchema],
      required: true,
    },

    note: {
      type: String,
      default: "",
    },

    factory_note: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["NEW", "CONFIRMED", "DONE"],
      default: "NEW",
    },

    order_no: {
      type: Number,
      required: true,
      unique: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("FactoryOrder", FactoryOrderSchema);

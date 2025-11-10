const mongoose = require("mongoose");

const UnitInvoiceSchema = new mongoose.Schema(
  {
    unit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    unit_nomi: { type: String, required: true },
    mahsulotlar: [
      {
        kategoriya_id: { type: mongoose.Schema.Types.ObjectId, required: true },
        kategoriya_nomi: { type: String, required: true },
        miqdor: { type: Number, required: true },
        birlik: { type: String, default: "dona" },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    created_by: { type: String, default: "Ishchi" },
    approved_by: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UnitInvoice", UnitInvoiceSchema);

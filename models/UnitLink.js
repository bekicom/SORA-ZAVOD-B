const mongoose = require("mongoose");

const UnitLinkSchema = new mongoose.Schema(
  {
    from_unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit", // Qayerdan chiqadi (masalan: biskvit)
      required: true,
    },
    to_unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit", // Qayerga ketadi (masalan: tort)
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UnitLink", UnitLinkSchema);

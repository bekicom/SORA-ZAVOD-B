// models/Admin.js
const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    login: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    parol_hash: {
      type: String,
      required: true,
    },
    rol: {
      type: String,
      enum: ["admin", "omborchi"], // ✅ YANGI: ikkala rol
      default: "admin",
    },
    ism: {
      type: String,
      required: true,
      trim: true,
    },
    lavozim: {
      type: String,
      default: "",
    },
    status: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", AdminSchema);

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
      default: "admin", // Har doim admin
      immutable: true, // O‘zgartirib bo‘lmaydi
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", AdminSchema);

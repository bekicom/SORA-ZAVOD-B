const mongoose = require("mongoose");

/* ==========================================================
   🧱 Admin2 Model — Asosiy ombor uchun admin
========================================================== */
const Admin2Schema = new mongoose.Schema(
  {
    // Foydalanuvchi nomi
    username: {
      type: String,
      required: true,
      trim: true,
    },

    // Parol
    password: {
      type: String,
      required: true,
    },

    // Rol (doimiy admin2)
    role: {
      type: String,
      default: "admin2",
    },

    // Faollik holati
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin2", Admin2Schema);

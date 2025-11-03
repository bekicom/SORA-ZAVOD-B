const mongoose = require("mongoose");

// 🔹 Har bir kategoriya subdocument sifatida
const CategorySchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Kategoriya nomi kiritilishi shart"],
      trim: true,
    },
  },
  { _id: true, timestamps: false }
);

const UnitSchema = new mongoose.Schema(
  {
    // Bo‘lim nomi
    nom: {
      type: String,
      required: [true, "Bo‘lim nomi kiritilishi shart"],
      trim: true,
    },

    // Turi: tayyor yoki yarim_tayyor
    turi: {
      type: String,
      enum: ["tayyor", "yarim_tayyor"],
      required: [
        true,
        "Bo‘lim turi kiritilishi shart (tayyor yoki yarim_tayyor)",
      ],
    },

    // Qavat (2 yoki 3)
    qavat: {
      type: Number,
      enum: [2, 3],
      required: [true, "Qavat 2 yoki 3 bo‘lishi kerak"],
    },

    // Unikal 4 xonali kod
    unit_code: {
      type: String,
      unique: true,
      required: true,
    },

    // 🔹 Kategoriyalar endi obyekt ko‘rinishida
    kategoriyalar: {
      type: [CategorySchema],
      default: [],
    },

    // Faollik holati
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Kod avtomatik generatsiya
UnitSchema.pre("validate", function (next) {
  if (!this.unit_code) {
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.unit_code = random;
  }
  next();
});

module.exports = mongoose.model("Unit", UnitSchema);

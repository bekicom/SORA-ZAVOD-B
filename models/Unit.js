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

// 🔹 Har bir bo‘limning ichki ombori uchun subdocument
const UnitOmborSchema = new mongoose.Schema(
  {
    kategoriya_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Kategoriya ID kiritilishi kerak"],
    },
    kategoriya_nomi: {
      type: String,
      required: [true, "Kategoriya nomi kiritilishi kerak"],
      trim: true,
    },
    miqdor: {
      type: Number,
      default: 0,
      min: [0, "Miqdor manfiy bo‘lmasligi kerak"],
    },
    birlik: {
      type: String,
      default: "dona",
      enum: [
        "dona",
        "kg",
        "litr",
        "metr",
        "qop",
        "ta",
        "ml",
        "gramm",
        "tonna",
        "upakovka",
        "box",
        "bo‘lak",
      ],
    },
    saqlanadigan_joy: {
      type: String,
      enum: ["haladenik", "ombor"],
      default: "haladenik",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true, timestamps: false }
);

// 🔹 Asosiy Unit sxemasi
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

    // 🔹 Kategoriyalar
    kategoriyalar: {
      type: [CategorySchema],
      default: [],
    },

    // 🔹 Bo‘limning ichki ombori
    unit_ombor: {
      type: [UnitOmborSchema],
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

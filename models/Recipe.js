const mongoose = require("mongoose");

const RecipeSchema = new mongoose.Schema(
  {
    // 🔹 Qaysi Unit (bo‘lim)ga tegishli
    unit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: [true, "Bo‘lim ID (unit_id) kiritilishi kerak"],
    },

    // 🔹 Qaysi kategoriya uchun tex karta yozilmoqda
    kategoriya_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Kategoriya ID (kategoriya_id) kiritilishi kerak"],
    },

    // 🔹 Kategoriya nomi (faqat o‘qish uchun)
    kategoriya_nomi: {
      type: String,
      trim: true,
    },

    // 🔹 Tex kartadagi mahsulotlar
    mahsulotlar: [
      {
        nom: { type: String, required: true, trim: true },
        miqdor: { type: Number, required: true },
        birlik: {
          type: String,
          required: true,
          trim: true,
          enum: [
            "dona",
            "ta",
            "kg",
            "g",
            "l",
            "ml",
            "m",
            "sm",
            "m2",
            "m3",
            "qop",
            "quti",
          ],
        },
      },
    ],

    // 🔹 Tex karta nechta mahsulot uchun yozilgan
    umumiy_hajm: {
      type: Number,
      default: 1,
    },

    // 🔹 Faollik holati
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 🔹 Har bir bo‘limdagi kategoriya uchun unikal tex karta
RecipeSchema.index({ unit_id: 1, kategoriya_id: 1 }, { unique: true });

module.exports = mongoose.model("Recipe", RecipeSchema);

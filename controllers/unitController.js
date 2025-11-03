// controllers/unitController.js
const Unit = require("../models/Unit");
const Recipe = require("../models/Recipe");

/* ===================================================
   🏗️ 1️⃣ Yangi Unit (bo‘lim) yaratish
=================================================== */

/* 🏗️ Yangi bo‘lim yaratish */
exports.createUnit = async (req, res) => {
  try {
    const { nom, turi, qavat } = req.body;

    if (!nom || !turi || !qavat) {
      return res.status(400).json({
        success: false,
        message: "nom, turi va qavat kiritilishi shart",
      });
    }

    if (!["tayyor", "yarim_tayyor"].includes(turi)) {
      return res.status(400).json({
        success: false,
        message: "turi faqat 'tayyor' yoki 'yarim_tayyor' bo‘lishi mumkin",
      });
    }

    if (![2, 3].includes(Number(qavat))) {
      return res.status(400).json({
        success: false,
        message: "Qavat faqat 2 yoki 3 bo‘lishi mumkin",
      });
    }

    const unit = new Unit({ nom, turi, qavat });
    await unit.save();

    res.status(201).json({
      success: true,
      message: "Bo‘lim muvaffaqiyatli yaratildi ✅",
      data: {
        id: unit._id,
        nom: unit.nom,
        turi: unit.turi,
        qavat: unit.qavat,
        unit_code: unit.unit_code,
      },
    });
  } catch (err) {
    console.error("createUnit error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};
/* ===================================================
   📋 2️⃣ Barcha bo‘limlarni olish
=================================================== */
exports.getUnits = async (req, res) => {
  try {
    const units = await Unit.find();
    res.json({
      success: true,
      count: units.length,
      data: units,
    });
  } catch (err) {
    console.error("getUnits error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ===================================================
   🔍 3️⃣ Bitta bo‘limni ID orqali olish
=================================================== */
exports.getUnitById = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: "Bo‘lim topilmadi" });
    }
    res.json({ success: true, data: unit });
  } catch (err) {
    console.error("getUnitById error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ===================================================
   🔎 4️⃣ Kod orqali bo‘limni olish
=================================================== */
exports.getUnitByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const unit = await Unit.findOne({ unit_code: code.toUpperCase() });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Bo‘lim topilmadi yoki kod noto‘g‘ri",
      });
    }

    res.json({
      success: true,
      message: "Bo‘lim ma’lumoti topildi",
      data: unit,
    });
  } catch (err) {
    console.error("getUnitByCode error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ===================================================
   ➕ 5️⃣ Bo‘limga yangi kategoriya qo‘shish
=================================================== */
exports.addCategory = async (req, res) => {
  try {
    const { kategoriya } = req.body;

    if (!kategoriya || typeof kategoriya !== "string") {
      return res.status(400).json({
        success: false,
        message: "Kategoriya nomi kiritilishi shart",
        example: { kategoriya: "Shokoladli tort" },
      });
    }

    const unit = await Unit.findById(req.params.id);
    if (!unit)
      return res
        .status(404)
        .json({ success: false, message: "Bo‘lim topilmadi" });

    // 🔹 Eski yoki yangi formatdagi kategoriyalarni tekshirish
    const exists = unit.kategoriyalar.find((cat) => {
      if (typeof cat === "string") {
        // eski format uchun
        return cat.toLowerCase() === kategoriya.toLowerCase();
      } else if (cat.nom) {
        // yangi format uchun
        return cat.nom.toLowerCase() === kategoriya.toLowerCase();
      }
      return false;
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Bu kategoriya allaqachon mavjud",
      });
    }

    // 🔹 Yangi obyekt formatida qo‘shish
    unit.kategoriyalar.push({ nom: kategoriya.trim() });

    await unit.save();

    // 🔹 Yangilangan unitni qaytarish
    const updated = await Unit.findById(req.params.id);

    res.json({
      success: true,
      message: "Kategoriya muvaffaqiyatli qo‘shildi ✅",
      data: updated,
    });
  } catch (err) {
    console.error("addCategory error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ===================================================
   🗑️ 6️⃣ Bo‘limni o‘chirish
=================================================== */
exports.deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findByIdAndDelete(req.params.id);
    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: "Bo‘lim topilmadi" });
    }
    res.json({ success: true, message: "Bo‘lim o‘chirildi ✅" });
  } catch (err) {
    console.error("deleteUnit error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};



exports.getCategoryWithRecipe = async (req, res) => {
  try {
    const { unit_id, kategoriya_id } = req.params;

    // 🔹 Bo‘limni topamiz
    const unit = await Unit.findById(unit_id);
    if (!unit)
      return res
        .status(404)
        .json({ success: false, message: "Bo‘lim topilmadi" });

    // 🔹 Kategoriyani topamiz
    const kategoriya = unit.kategoriyalar.id(kategoriya_id);
    if (!kategoriya)
      return res
        .status(404)
        .json({ success: false, message: "Kategoriya topilmadi" });

    // 🔹 Shu kategoriya uchun tex kartani topamiz
    const recipe = await Recipe.findOne({
      unit_id,
      kategoriya_id,
    }).select("mahsulotlar umumiy_hajm status createdAt");

    res.json({
      success: true,
      kategoriya,
      tex_karta: recipe || null,
    });
  } catch (err) {
    console.error("getCategoryWithRecipe error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};
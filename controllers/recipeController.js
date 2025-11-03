const Recipe = require("../models/Recipe");
const Unit = require("../models/Unit");

/* ===================================================
   🧾 1️⃣ Tex karta yaratish
=================================================== */
exports.createRecipe = async (req, res) => {
  try {
    const {
      unit_id,
      kategoriya_id,
      kategoriya_nomi,
      mahsulotlar,
      umumiy_hajm,
    } = req.body;

    if (
      !unit_id ||
      !kategoriya_id ||
      !mahsulotlar ||
      mahsulotlar.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "unit_id, kategoriya_id va mahsulotlar kiritilishi shart",
      });
    }

    const unit = await Unit.findById(unit_id);
    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: "Bo‘lim topilmadi" });
    }

    // 🔹 Dublikat tekshiruvi
    const existing = await Recipe.findOne({ unit_id, kategoriya_id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Bu kategoriya uchun tex karta allaqachon mavjud",
      });
    }

    const recipe = new Recipe({
      unit_id,
      kategoriya_id,
      kategoriya_nomi,
      mahsulotlar,
      umumiy_hajm: umumiy_hajm || 1,
    });

    await recipe.save();

    res.status(201).json({
      success: true,
      message: "Tex karta muvaffaqiyatli yaratildi ✅",
      data: recipe,
    });
  } catch (err) {
    console.error("createRecipe error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ===================================================
   📋 2️⃣ Barcha tex kartalarni olish (Admin uchun)
=================================================== */
exports.getRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find().populate("unit_id", "nom turi qavat");
    res.json({
      success: true,
      count: recipes.length,
      data: recipes,
    });
  } catch (err) {
    console.error("getRecipes error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ===================================================
   🔍 3️⃣ Bitta tex kartani ID orqali olish
=================================================== */
exports.getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate(
      "unit_id",
      "nom turi qavat"
    );
    if (!recipe)
      return res
        .status(404)
        .json({ success: false, message: "Tex karta topilmadi" });

    res.json({ success: true, data: recipe });
  } catch (err) {
    console.error("getRecipeById error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ===================================================
   📦 4️⃣ Unit va kategoriya bo‘yicha tex kartani olish
=================================================== */
exports.getRecipeByCategory = async (req, res) => {
  try {
    const { unit_id, kategoriya_id } = req.params;

    if (!unit_id || !kategoriya_id) {
      return res.status(400).json({
        success: false,
        message: "unit_id va kategoriya_id kerak",
      });
    }

    const recipe = await Recipe.findOne({ unit_id, kategoriya_id });

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: "Bu kategoriya uchun tex karta topilmadi",
      });
    }

    res.json({
      success: true,
      message: "Tex karta topildi ✅",
      data: recipe.mahsulotlar,
    });
  } catch (err) {
    console.error("getRecipeByCategory error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ===================================================
   🗑️ 5️⃣ Tex kartani o‘chirish
=================================================== */
exports.deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe)
      return res
        .status(404)
        .json({ success: false, message: "Tex karta topilmadi" });

    res.json({ success: true, message: "Tex karta o‘chirildi ✅" });
  } catch (err) {
    console.error("deleteRecipe error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ===================================================
   ✏️ 6️⃣ Tex kartani yangilash
=================================================== */
exports.updateRecipe = async (req, res) => {
  try {
    const { mahsulotlar, umumiy_hajm } = req.body;

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe)
      return res
        .status(404)
        .json({ success: false, message: "Tex karta topilmadi" });

    if (mahsulotlar) recipe.mahsulotlar = mahsulotlar;
    if (umumiy_hajm) recipe.umumiy_hajm = umumiy_hajm;

    await recipe.save();

    res.json({
      success: true,
      message: "Tex karta yangilandi ✅",
      data: recipe,
    });
  } catch (err) {
    console.error("updateRecipe error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

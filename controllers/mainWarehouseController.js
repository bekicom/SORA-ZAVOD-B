const MainWarehouse = require("../models/MainWarehouse");
const Unit = require("../models/Unit");

/* ==========================================================
   📋 1️⃣ Asosiy ombordagi mahsulotlarni olish
========================================================== */
exports.getProducts = async (req, res) => {
  try {
    const products = await MainWarehouse.find().populate("unit_id", "nom turi");

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("getProducts error:", error);
    res.status(500).json({ success: false, message: "Server xatolik" });
  }
};

/* ==========================================================
   📜 2️⃣ Bitta BO‘LIM (unit) bo‘yicha barcha mahsulotlar kirim tarixi
========================================================== */
exports.getUnitKirimHistory = async (req, res) => {
  try {
    const { unit_id } = req.params;

    // 🔹 Bo‘limni topamiz
    const unit = await Unit.findById(unit_id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Bo‘lim topilmadi ❌",
      });
    }

    // 🔹 Asosiy omborda shu bo‘limdan kelgan mahsulotlarni topamiz
    const mahsulotlar = await MainWarehouse.find({ unit_id });

    if (!mahsulotlar.length) {
      return res.json({
        success: true,
        message: `📭 "${unit.nom}" bo‘limidan asosiy omborga hali mahsulot kiritilmagan`,
        unit: {
          id: unit._id,
          nom: unit.nom,
          turi: unit.turi,
        },
        data: [],
      });
    }

    // 🔹 Har bir kirimni alohida yozuv sifatida tekislashtiramiz
    const flatData = mahsulotlar.flatMap((product) =>
      product.kirim_tarix.map((kirim) => ({
        kategoriya_nomi: product.kategoriya_nomi,
        miqdor: kirim.miqdor,
        kiritgan: kirim.kiritgan,
        sana: new Date(kirim.sana).toLocaleString("uz-UZ"),
      }))
    );

    // 🔹 JSON javob
    res.json({
      success: true,
      message: `📜 "${unit.nom}" bo‘limidan asosiy omborga kelgan mahsulotlar tarixi`,
      unit: {
        id: unit._id,
        nom: unit.nom,
        turi: unit.turi,
      },
      count: flatData.length,
      data: flatData.sort((a, b) => new Date(b.sana) - new Date(a.sana)), // so‘nggi kiritilganlar birinchi chiqadi
    });
  } catch (error) {
    console.error("getUnitKirimHistory error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};

/* ==========================================================
   🧾 3️⃣ ADMIN UCHUN – Ombordagi mavjud mahsulotlarni ko‘rish
========================================================== */
exports.getAdminView = async (req, res) => {
  try {
    const products = await MainWarehouse.find()
      .populate("unit_id", "nom turi")
      .sort({ updatedAt: -1 });

    if (!products.length) {
      return res.json({
        success: true,
        message: "Omborda hali mahsulotlar mavjud emas ❗",
        data: [],
      });
    }

    const formatted = products.map((p) => ({
      id: p._id,
      kategoriya_nomi: p.kategoriya_nomi,
      miqdor: p.miqdor,
      birlik: "dona",
      unit_nomi: p.unit_id?.nom || "Noma’lum bo‘lim",
      unit_turi: p.unit_id?.turi || "—",
      last_kirim_date: p.last_kirim_date
        ? new Date(p.last_kirim_date).toLocaleString("uz-UZ")
        : "Ma’lumot yo‘q",
    }));

    res.json({
      success: true,
      message: "📦 Asosiy ombordagi barcha mahsulotlar",
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("getAdminView error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};

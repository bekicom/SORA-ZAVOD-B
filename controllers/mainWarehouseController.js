const MainWarehouse = require("../models/MainWarehouse");
const Unit = require("../models/Unit");

exports.createKirim = async (req, res) => {
  try {
    const { unit_id, kategoriya_id, miqdor, admin_name } = req.body;

    // 1️⃣ Unitni topamiz
    const unit = await Unit.findById(unit_id);
    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: "Unit topilmadi" });
    }

    // 2️⃣ Kategoriya nomini topamiz
    const kategoriya = unit.kategoriyalar.find(
      (k) => k._id.toString() === kategoriya_id
    );

    if (!kategoriya) {
      return res
        .status(404)
        .json({ success: false, message: "Kategoriya topilmadi" });
    }

    // 3️⃣ Mahsulot avval borligini tekshiramiz
    let mahsulot = await MainWarehouse.findOne({
      kategoriya_id,
      unit_id,
    });

    if (mahsulot) {
      // Agar mavjud bo‘lsa, miqdorni qo‘shamiz
      mahsulot.miqdor += Number(miqdor);
      mahsulot.last_kirim_date = new Date();
      mahsulot.kirim_tarix.push({
        unit_nomi: unit.nom,
        miqdor,
        kiritgan: admin_name || "Admin",
      });
      await mahsulot.save();
    } else {
      // Yangi mahsulot sifatida yaratiladi
      mahsulot = await MainWarehouse.create({
        kategoriya_nomi: kategoriya.nom,
        kategoriya_id,
        unit_id,
        miqdor,
        kirim_tarix: [
          {
            unit_nomi: unit.nom,
            miqdor,
            kiritgan: admin_name || "Admin",
          },
        ],
      });
    }

    res.status(201).json({
      success: true,
      message: "✅ Mahsulot asosiy omborga kiritildi",
      data: mahsulot,
    });
  } catch (error) {
    console.error("createKirim error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};

// 🧾 Barcha mahsulotlarni olish
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

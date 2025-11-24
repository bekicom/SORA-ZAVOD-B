const Unit = require("../models/Unit");
const Recipe = require("../models/Recipe");

/* ===================================================
   🏗️ 1️⃣ Yangi Unit (bo‘lim) yaratish
=================================================== */
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
   🔎 4️⃣ Bo‘limni unit_code orqali olish (YAKUNIY)
=================================================== */
exports.getUnitByCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        message: "Unit code kiritilishi shart",
      });
    }

    const unit = await Unit.findOne({ unit_code: code.toUpperCase() });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Bo‘lim topilmadi yoki code noto‘g‘ri",
      });
    }

    res.json({
      success: true,
      message: "Bo‘lim topildi ✅",
      data: {
        id: unit._id,
        nom: unit.nom,
        turi: unit.turi,
        qavat: unit.qavat,
        unit_code: unit.unit_code,
        kategoriyalar: unit.kategoriyalar || [],
        unit_ombor: unit.unit_ombor || [],
      },
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

    const exists = unit.kategoriyalar.find(
      (cat) => cat.nom.toLowerCase() === kategoriya.toLowerCase()
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Bu kategoriya allaqachon mavjud",
      });
    }

    unit.kategoriyalar.push({ nom: kategoriya.trim() });
    await unit.save();

    res.json({
      success: true,
      message: "Kategoriya muvaffaqiyatli qo‘shildi ✅",
      data: unit.kategoriyalar,
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

/* ===================================================
   🔹 7️⃣ Bo‘lim kategoriyalarini olish
=================================================== */
exports.getUnitCategories = async (req, res) => {
  try {
    const { id } = req.params;
    const unit = await Unit.findById(id);

    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: "Bo‘lim topilmadi" });
    }

    res.json({
      success: true,
      message: "Bo‘lim kategoriyalari",
      data: unit.kategoriyalar,
    });
  } catch (error) {
    console.error("getUnitCategories error:", error);
    res.status(500).json({ success: false, message: "Server xatolik", error });
  }
};

/* ===================================================
   📦 8️⃣ Bo‘lim ichki omboriga kirim qilish
=================================================== */
exports.addToUnitOmbor = async (req, res) => {
  try {
    const { id } = req.params; // unit id
    const { kategoriya_id, miqdor, saqlanadigan_joy } = req.body;

    const unit = await Unit.findById(id);
    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: "Bo‘lim topilmadi" });
    }

    // 🔍 Kategoriya nomini unit ichidan topamiz
    const kategoriya = unit.kategoriyalar.find(
      (k) => k._id.toString() === kategoriya_id
    );

    if (!kategoriya) {
      return res
        .status(404)
        .json({ success: false, message: "Kategoriya topilmadi" });
    }

    if (!unit.unit_ombor) unit.unit_ombor = [];

    // 🔍 Omborda shu mahsulot bormi?
    const existing = unit.unit_ombor.find(
      (item) => item.kategoriya_id.toString() === kategoriya_id
    );

    if (existing) {
      existing.miqdor += Number(miqdor);
    } else {
      unit.unit_ombor.push({
        kategoriya_id,
        kategoriya_nomi: kategoriya.nom,
        miqdor: Number(miqdor),
        saqlanadigan_joy: saqlanadigan_joy || "haladenik",
      });
    }

    await unit.save();

    res.json({
      success: true,
      message: "✅ Mahsulot unit omboriga kiritildi",
      data: unit.unit_ombor,
    });
  } catch (error) {
    console.error("addToUnitOmbor error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};

/* ===================================================
   📋 9️⃣ Unit ichki omborini ko‘rish
=================================================== */
exports.getUnitOmbor = async (req, res) => {
  try {
    const { id } = req.params;
    const unit = await Unit.findById(id);

    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: "Bo‘lim topilmadi" });
    }

    res.json({
      success: true,
      message: "Bo‘lim ichki ombori",
      data: unit.unit_ombor || [],
    });
  } catch (error) {
    console.error("getUnitOmbor error:", error);
    res.status(500).json({ success: false, message: "Server xatolik", error });
  }
};

/* ===================================================
   🔁 10️⃣ Unit uchun bog‘langan bo‘limlarni olish
=================================================== */
exports.getAvailableTargets = async (req, res) => {
  try {
    const { id } = req.params; // unit_id (masalan, biskivit bo‘lim)
    const unit = await Unit.findById(id).populate(
      "linked_units",
      "nom unit_code kategoriyalar"
    );

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Bo‘lim topilmadi ❌",
      });
    }

    if (!unit.linked_units || unit.linked_units.length === 0) {
      return res.json({
        success: true,
        message: "Bu bo‘limga bog‘langan boshqa bo‘limlar yo‘q ❗",
        data: [],
      });
    }

    // Har bir bog‘langan bo‘lim ma’lumotlarini chiroyli formatda qaytaramiz
    const formatted = unit.linked_units.map((linked) => ({
      to_unit_code: linked.unit_code,
      to_unit_nom: linked.nom,
      kategoriyalar: linked.kategoriyalar.map((k) => ({
        kategoriya_id: k._id,
        kategoriya_nomi: k.nom,
      })),
    }));

    res.json({
      success: true,
      message: "🔗 Bog‘langan bo‘limlar va ularning kategoriyalari",
      data: formatted,
    });
  } catch (error) {
    console.error("getAvailableTargets error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};



// controllers/unitController.js
const mongoose = require("mongoose");
const Unit = require("../models/Unit");
// const Recipe = require("../models/Recipe"); // hozir ishlatilmayapti
const WarehouseOrder = require("../models/WarehouseOrder");

/* ===================================================
   🏗️ 1️⃣ Yangi Unit (bo‘lim) yaratish
=================================================== */
exports.createUnit = async (req, res) => {
  try {
    const { nom, turi, qavat } = req.body;

    if (!nom || !turi || qavat == null) {
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

    const qavatNum = Number(qavat);
    if (![2, 3].includes(qavatNum)) {
      return res.status(400).json({
        success: false,
        message: "Qavat faqat 2 yoki 3 bo‘lishi mumkin",
      });
    }

    const unit = new Unit({ nom: nom.trim(), turi, qavat: qavatNum });
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
    const units = await Unit.find().lean();
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
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Unit ID noto‘g‘ri",
      });
    }

    const unit = await Unit.findById(id);
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
   🔎 4️⃣ Bo‘limni unit_code orqali olish
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
    const { id } = req.params;

    if (!kategoriya || typeof kategoriya !== "string") {
      return res.status(400).json({
        success: false,
        message: "Kategoriya nomi kiritilishi shart",
        example: { kategoriya: "Shokoladli tort" },
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Unit ID noto‘g‘ri",
      });
    }

    const unit = await Unit.findById(id);
    if (!unit)
      return res
        .status(404)
        .json({ success: false, message: "Bo‘lim topilmadi" });

    const cleanName = kategoriya.trim();

    const exists = (unit.kategoriyalar || []).find(
      (cat) => cat.nom.toLowerCase() === cleanName.toLowerCase()
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Bu kategoriya allaqachon mavjud",
      });
    }

    unit.kategoriyalar.push({ nom: cleanName });
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
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Unit ID noto‘g‘ri",
      });
    }

    const unit = await Unit.findByIdAndDelete(id);
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Unit ID noto‘g‘ri",
      });
    }

    const unit = await Unit.findById(id);

    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: "Bo‘lim topilmadi" });
    }

    res.json({
      success: true,
      message: "Bo‘lim kategoriyalari",
      data: unit.kategoriyalar || [],
    });
  } catch (error) {
    console.error("getUnitCategories error:", error);
    res.status(500).json({ success: false, message: "Server xatolik" });
  }
};

/* ===================================================
   📦 8️⃣ Bo‘lim ichki omboriga kirim qilish
=================================================== */
exports.addToUnitOmbor = async (req, res) => {
  try {
    const { id } = req.params; // unit id
    const { kategoriya_id, miqdor, saqlanadigan_joy, birlik } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Unit ID noto‘g‘ri" });
    }
    if (!mongoose.Types.ObjectId.isValid(kategoriya_id)) {
      return res
        .status(400)
        .json({ success: false, message: "Kategoriya ID noto‘g‘ri" });
    }

    const qty = Number(miqdor);
    if (Number.isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "miqdor musbat son bo‘lishi kerak",
      });
    }

    const unit = await Unit.findById(id);
    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: "Bo‘lim topilmadi" });
    }

    // 🔍 Kategoriya nomini unit ichidan topamiz
    const kategoriya = (unit.kategoriyalar || []).find(
      (k) => k._id.toString() === kategoriya_id.toString()
    );

    if (!kategoriya) {
      return res
        .status(404)
        .json({ success: false, message: "Kategoriya topilmadi" });
    }

    if (!unit.unit_ombor) unit.unit_ombor = [];

    // 🔍 Omborda shu mahsulot bormi?
    const existing = unit.unit_ombor.find(
      (item) => item.kategoriya_id.toString() === kategoriya_id.toString()
    );

    if (existing) {
      existing.miqdor += qty;
      if (birlik) existing.birlik = birlik;
      if (saqlanadigan_joy) existing.saqlanadigan_joy = saqlanadigan_joy;
    } else {
      unit.unit_ombor.push({
        kategoriya_id,
        kategoriya_nomi: kategoriya.nom,
        miqdor: qty,
        birlik: birlik || "dona",
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Unit ID noto‘g‘ri",
      });
    }

    const unit = await Unit.findById(id).lean();
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Bo‘lim topilmadi",
      });
    }

    const kategoriyalarMap = new Map(
      (unit.kategoriyalar || []).map((k) => [k._id.toString(), k.nom]),
    );

    const ombor = (unit.unit_ombor || []).map((item) => ({
      _id: item._id,
      kategoriya_id: item.kategoriya_id,
      kategoriya_nomi:
        kategoriyalarMap.get(item.kategoriya_id.toString()) ||
        "Noma’lum kategoriya",
      miqdor: item.miqdor,
      birlik: item.birlik,
      saqlanadigan_joy: item.saqlanadigan_joy,
      createdAt: item.createdAt,
    }));

    res.json({
      success: true,
      message: "Bo‘lim ichki ombori",
      data: ombor,
    });
  } catch (error) {
    console.error("getUnitOmbor error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};


/* ===================================================
   🔁 10️⃣ Unit uchun bog‘langan bo‘limlarni olish
   Eslatma: Unit modelingizda linked_units bo‘lmasa,
   bu funksiya bo‘sh qaytadi.
=================================================== */
exports.getAvailableTargets = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Unit ID noto‘g‘ri" });
    }

    // linked_units bo‘lsa populate qiladi, bo‘lmasa oddiy find
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

    const formatted = unit.linked_units.map((linked) => ({
      to_unit_code: linked.unit_code,
      to_unit_nom: linked.nom,
      kategoriyalar: (linked.kategoriyalar || []).map((k) => ({
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

exports.getIncomingOrdersForUnit = async (req, res) => {
  try {
    const { id } = req.params; // unit_id

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Unit ID noto‘g‘ri",
      });
    }

    /* =========================
       UNIT + KATEGORIYALAR
    ========================= */
    const unit = await Unit.findById(id).lean();
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Bo‘lim topilmadi",
      });
    }

    const kategoriyaMap = new Map(
      (unit.kategoriyalar || []).map((k) => [k._id.toString(), k.nom]),
    );

    /* =========================
       ORDERS
    ========================= */
    const orders = await WarehouseOrder.find({
      unit_id: id,
      status: { $in: ["completed", "confirmed"] },
      $or: [{ unit_received: { $exists: false } }, { unit_received: false }],
    })
      .sort({ completed_at: -1, createdAt: -1 })
      .lean();

    /* =========================
       FORMAT
    ========================= */
    const formatted = orders.map((o) => ({
      _id: o._id,
      unit_id: o.unit_id,
      kategoriya_id: o.kategoriya_id,
      kategoriya_nomi:
        kategoriyaMap.get(o.kategoriya_id?.toString()) || "Noma’lum kategoriya",
      quantity: o.quantity,
      recipe_items: o.recipe_items || [],
      requested_by: o.requested_by,
      status: o.status,
      createdAt: o.createdAt,
      completed_at: o.completed_at,
      unit_received: o.unit_received || false,
    }));

    res.json({
      success: true,
      message: "Unitga kelgan tayyor zakaslar",
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("getIncomingOrdersForUnit error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};


/* ===================================================
   ✅ 12️⃣ Unit zakasni qabul qilish (receive)
   - tayyor mahsulot unit omboriga kirim bo‘ladi
=================================================== */
exports.confirmOrderReceivedByUnit = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { unit_id, received_by, saqlanadigan_joy } = req.body;

    if (!mongoose.Types.ObjectId.isValid(order_id)) {
      return res.status(400).json({
        success: false,
        message: "Order ID noto‘g‘ri",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(unit_id)) {
      return res.status(400).json({
        success: false,
        message: "Unit ID noto‘g‘ri",
      });
    }

    const order = await WarehouseOrder.findById(order_id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Zakas topilmadi",
      });
    }

    if (order.unit_id.toString() !== unit_id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bu zakas sizga tegishli emas",
      });
    }

    if (order.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Faqat completed zakasni qabul qilish mumkin",
      });
    }

    if (order.unit_received) {
      return res.status(400).json({
        success: false,
        message: "Zakas allaqachon qabul qilingan",
      });
    }

    const unit = await Unit.findById(unit_id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit topilmadi",
      });
    }

    // ✅ Tayyor mahsulotni unit_ombor ga kirim qilamiz
    const qty = Number(order.quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Zakas quantity noto‘g‘ri",
      });
    }

    if (!unit.unit_ombor) unit.unit_ombor = [];

    const existing = unit.unit_ombor.find(
      (i) => i.kategoriya_id.toString() === order.kategoriya_id.toString()
    );

    if (existing) {
      existing.miqdor += qty;
    } else {
      unit.unit_ombor.push({
        kategoriya_id: order.kategoriya_id,
        kategoriya_nomi: order.kategoriya_nomi,
        miqdor: qty,
        birlik: "dona",
        saqlanadigan_joy: saqlanadigan_joy || "haladenik",
      });
    }

    await unit.save();

    // ✅ Orderni "received" flag bilan yopamiz
    order.unit_received = true;
    order.received_by = received_by || "Unit";
    order.received_at = new Date();
    await order.save();

    res.json({
      success: true,
      message: "✅ Zakas qabul qilindi va unit omboriga kirim bo‘ldi",
      data: {
        order_id: order._id,
        unit_received: order.unit_received,
        received_by: order.received_by,
        received_at: order.received_at,
        unit_ombor: unit.unit_ombor,
      },
    });
  } catch (error) {
    console.error("confirmOrderReceivedByUnit error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};

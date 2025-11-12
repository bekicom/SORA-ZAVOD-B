const UnitLink = require("../models/UnitLink");
const Unit = require("../models/Unit");

/* =====================================================
   ➕ 1️⃣ Yangi bog‘lanish yaratish
===================================================== */
exports.createLink = async (req, res) => {
  try {
    const { from_unit, to_unit, description } = req.body;

    // Tekshiruv
    if (!from_unit || !to_unit)
      return res
        .status(400)
        .json({ success: false, message: "Ikkala unit ham tanlanishi kerak" });

    if (from_unit === to_unit)
      return res.status(400).json({
        success: false,
        message: "Bir bo‘lim o‘zini o‘zi bog‘lay olmaydi ❌",
      });

    const from = await Unit.findById(from_unit);
    const to = await Unit.findById(to_unit);

    if (!from || !to)
      return res.status(404).json({
        success: false,
        message: "Beruvchi yoki oluvchi bo‘lim topilmadi",
      });

    // Agar avvaldan shu bog‘lanish bo‘lsa
    const exists = await UnitLink.findOne({ from_unit, to_unit });
    if (exists)
      return res.status(400).json({
        success: false,
        message: "Bu bo‘limlar allaqachon bog‘langan ❗",
      });

    const link = await UnitLink.create({ from_unit, to_unit, description });

    res.status(201).json({
      success: true,
      message: "Bo‘limlar muvaffaqiyatli bog‘landi ✅",
      data: {
        id: link._id,
        from: from.nom,
        to: to.nom,
        description: link.description,
      },
    });
  } catch (error) {
    console.error("createLink error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server xatolik", error: error.message });
  }
};

/* =====================================================
   📋 2️⃣ Barcha bog‘lanishlarni olish
===================================================== */
exports.getLinks = async (req, res) => {
  try {
    const links = await UnitLink.find()
      .populate("from_unit", "nom turi")
      .populate("to_unit", "nom turi")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: links.length,
      data: links.map((l) => ({
        id: l._id,
        from: l.from_unit?.nom,
        to: l.to_unit?.nom,
        from_type: l.from_unit?.turi,
        to_type: l.to_unit?.turi,
        description: l.description,
      })),
    });
  } catch (error) {
    console.error("getLinks error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server xatolik", error: error.message });
  }
};

/* =====================================================
   🗑️ 3️⃣ Bog‘lanishni o‘chirish
===================================================== */
exports.deleteLink = async (req, res) => {
  try {
    const link = await UnitLink.findByIdAndDelete(req.params.id);
    if (!link)
      return res
        .status(404)
        .json({ success: false, message: "Bog‘lanish topilmadi" });

    res.json({
      success: true,
      message: "Bog‘lanish o‘chirildi ✅",
    });
  } catch (error) {
    console.error("deleteLink error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server xatolik", error: error.message });
  }
};

/* =====================================================
   🔍 5️⃣ Bitta bo‘limga bog‘langan boshqa bo‘limlarni olish
===================================================== */
exports.getLinkedUnits = async (req, res) => {
  try {
    const { unit_id } = req.params;

    if (!unit_id) {
      return res
        .status(400)
        .json({ success: false, message: "unit_id kerak" });
    }

    // Bo‘limni topamiz
    const unit = await Unit.findById(unit_id);
    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: "Bo‘lim topilmadi" });
    }

    // Bog‘langanlarni topamiz
    const links = await UnitLink.find({
      $or: [{ from_unit: unit_id }, { to_unit: unit_id }],
    })
      .populate("from_unit", "nom turi")
      .populate("to_unit", "nom turi");

    if (!links.length) {
      return res.json({
        success: true,
        message: "Bu bo‘lim hech kim bilan bog‘lanmagan",
        unit: { id: unit._id, nom: unit.nom, turi: unit.turi },
        connections: [],
      });
    }

    // Formatlab chiqamiz
    const formatted = links.map((l) => {
      // Agar bu unit "from_unit" bo‘lsa — u beruvchi
      if (l.from_unit._id.toString() === unit_id) {
        return {
          id: l._id,
          linked_unit_id: l.to_unit._id,
          linked_unit_nom: l.to_unit.nom,
          linked_unit_turi: l.to_unit.turi,
          relationship: "Beruvchi (jo‘natuvchi)",
        };
      }
      // Agar bu unit "to_unit" bo‘lsa — u oluvchi
      else {
        return {
          id: l._id,
          linked_unit_id: l.from_unit._id,
          linked_unit_nom: l.from_unit.nom,
          linked_unit_turi: l.from_unit.turi,
          relationship: "Qabul qiluvchi (oluvchi)",
        };
      }
    });

    res.json({
      success: true,
      message: `📋 ${unit.nom} bo‘limiga bog‘langan bo‘limlar`,
      unit: {
        id: unit._id,
        nom: unit.nom,
        turi: unit.turi,
      },
      count: formatted.length,
      connections: formatted,
    });
  } catch (error) {
    console.error("getLinkedUnits error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};
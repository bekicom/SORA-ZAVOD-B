const UnitInvoice = require("../models/UnitInvoice");
const Unit = require("../models/Unit");
// const MainWarehouse = require("../models/MainWarehouse");
const WarehouseRoom = require("../models/WarehouseRoom");

const syncGlobalProduct = require("../utils/syncGlobalProduct");

/* ===================================================
   🧾 1️⃣ Unit tomonidan yangi faktura yaratish
=================================================== */
exports.createInvoice = async (req, res) => {
  try {
    const { unit_id, mahsulotlar, created_by } = req.body;

    if (!unit_id || !Array.isArray(mahsulotlar) || mahsulotlar.length === 0) {
      return res.status(400).json({
        success: false,
        message: "unit_id va mahsulotlar to‘ldirilishi shart",
      });
    }

    const unit = await Unit.findById(unit_id);
    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: "Unit topilmadi" });
    }

    // Faktura yaratamiz
    const invoice = await UnitInvoice.create({
      unit_id,
      unit_nomi: unit.nom,
      mahsulotlar,
      created_by: created_by || "Ishchi",
    });

    res.status(201).json({
      success: true,
      message: "🧾 Faktura yaratildi va admin tasdiqlashini kutmoqda",
      data: invoice,
    });
  } catch (error) {
    console.error("createInvoice error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ===================================================
   📋 2️⃣ Admin barcha fakturalarni olish
=================================================== */
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await UnitInvoice.find({ status: "pending" })
      .populate("unit_id", "nom turi")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    console.error("getAllInvoices error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ===================================================
   🔍 3️⃣ Bitta fakturani olish
=================================================== */
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await UnitInvoice.findById(req.params.id).populate(
      "unit_id",
      "nom turi",
    );

    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Faktura topilmadi" });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error("getInvoiceById error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ===================================================
   ✅ 4️⃣ Fakturani tasdiqlash (Admin)
=================================================== */

exports.approveInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;

    const invoice = await UnitInvoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Faktura topilmadi",
      });
    }

    if (invoice.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Faktura allaqachon tasdiqlangan",
      });
    }

    const unit = await Unit.findById(invoice.unit_id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit topilmadi",
      });
    }

    /* =========================
       TAYYOR MAHSULOTLAR ROOM
    ========================= */
    let readyRoom = await WarehouseRoom.findOne({
      nom: "Tayyor mahsulotlar",
    });

    if (!readyRoom) {
      readyRoom = await WarehouseRoom.create({
        nom: "Tayyor mahsulotlar",
        mahsulotlar: [],
        kirimlar: [],
      });
    }

    /* =========================
       LOOP PRODUCTS
    ========================= */
    for (const p of invoice.mahsulotlar) {
      if (!p.kategoriya_id || !p.miqdor || p.miqdor <= 0) continue;

      const kategoriya = unit.kategoriyalar.find(
        (k) => k._id.toString() === p.kategoriya_id.toString(),
      );

      if (!kategoriya) continue;

      /* 1️⃣ UNIT OMBORIDAN MINUS */
      const unitItem = unit.unit_ombor.find(
        (i) => i.kategoriya_id.toString() === p.kategoriya_id.toString(),
      );

      if (unitItem) {
        unitItem.miqdor = Math.max(unitItem.miqdor - p.miqdor, 0);
      }

      /* 2️⃣ TAYYOR ROOMGA PLUS */
      const roomItem = readyRoom.mahsulotlar.find(
        (m) => m.nom === kategoriya.nom,
      );

      if (roomItem) {
        roomItem.miqdor += Number(p.miqdor);
        roomItem.turi = "tayyor";
      } else {
        readyRoom.mahsulotlar.push({
          nom: kategoriya.nom,
          turi: "tayyor",
          miqdor: Number(p.miqdor),
          birlik: "dona",
          price: 0,
        });
      }

      /* 3️⃣ KIRIM TARIXI */
      readyRoom.kirimlar.push({
        mahsulot: kategoriya.nom,
        miqdor: Number(p.miqdor),
        birlik: "dona",
        izoh: `Unit (${unit.nom}) dan kelgan`,
        sana: new Date(),
      });
    }

    await unit.save();
    await readyRoom.save();

    invoice.status = "approved";
    invoice.approved_by = approved_by || "Admin";
    invoice.approved_at = new Date();
    await invoice.save();

    res.json({
      success: true,
      message: "Faktura tasdiqlandi va Tayyor mahsulotlar omboriga joylandi",
      room: readyRoom.nom,
    });
  } catch (error) {
    console.error("approveInvoice error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: error.message,
    });
  }
};

/* ===================================================
   ❌ 5️⃣ Fakturani rad etish
=================================================== */
exports.rejectInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await UnitInvoice.findById(id);
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Faktura topilmadi" });
    }

    invoice.status = "rejected";
    invoice.rejection_reason = reason || "Sabab ko‘rsatilmagan";
    await invoice.save();

    res.json({
      success: true,
      message: "❌ Faktura rad etildi",
      data: invoice,
    });
  } catch (error) {
    console.error("rejectInvoice error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

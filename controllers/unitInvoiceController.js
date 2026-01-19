const UnitInvoice = require("../models/UnitInvoice");
const Unit = require("../models/Unit");
const MainWarehouse = require("../models/MainWarehouse");

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
      "nom turi"
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

    /* =========================
       INVOICE
    ========================= */
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

    /* =========================
       UNIT
    ========================= */
    const unit = await Unit.findById(invoice.unit_id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit topilmadi",
      });
    }

    /* =========================
       LOOP PRODUCTS
    ========================= */
    for (const p of invoice.mahsulotlar) {
      if (!p.kategoriya_id || !p.miqdor || p.miqdor <= 0) {
        console.warn("⚠️ Noto‘g‘ri mahsulot:", p);
        continue;
      }

      /* =========================
         KATEGORIYA
      ========================= */
      const kategoriya = unit.kategoriyalar.find(
        (k) => k._id.toString() === p.kategoriya_id.toString(),
      );

      if (!kategoriya) {
        console.warn("⚠️ Kategoriya topilmadi:", p.kategoriya_id);
        continue;
      }

      /* =========================
         1️⃣ GLOBAL PRODUCT (KATALOG)
      ========================= */
      const globalProduct = await syncGlobalProduct({
        name: kategoriya.nom,
        birlik: "dona",
        category: unit.nom,
      });

      if (!globalProduct || !globalProduct._id) {
        console.warn("⚠️ Global product yaratilmadi:", kategoriya.nom);
        continue;
      }

      /* =========================
         2️⃣ UNIT OMBORIDAN MINUS
      ========================= */
      const omborItem = unit.unit_ombor.find(
        (item) =>
          item.kategoriya_id &&
          item.kategoriya_id.toString() === p.kategoriya_id.toString(),
      );

      if (omborItem) {
        omborItem.miqdor = Math.max(
          Number(omborItem.miqdor) - Number(p.miqdor),
          0,
        );
      }

      /* =========================
         3️⃣ MAIN WAREHOUSE UPSERT
         (unique index bilan 100% mos)
      ========================= */
      const filter = {
        global_product_id: globalProduct._id,
        unit_id: unit._id,
        kategoriya_id: kategoriya._id,
      };

      const update = {
        $inc: { miqdor: Number(p.miqdor) },
        $setOnInsert: {
          global_product_id: globalProduct._id,
          unit_id: unit._id,
          kategoriya_id: kategoriya._id,
          kategoriya_nomi: kategoriya.nom,
          birlik: "dona",
        },
        $push: {
          kirim_tarix: {
            miqdor: Number(p.miqdor),
            kiritgan: approved_by || "Admin",
            sana: new Date(),
          },
        },
      };

      await MainWarehouse.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
      });
    }

    /* =========================
       SAVE
    ========================= */
    await unit.save();

    invoice.status = "approved";
    invoice.approved_by = approved_by || "Admin";
    invoice.approved_at = new Date();
    await invoice.save();

    res.json({
      success: true,
      message: "✅ Faktura tasdiqlandi (unit → main warehouse → global)",
      data: invoice,
    });
  } catch (error) {
    console.error("approveInvoice error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
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

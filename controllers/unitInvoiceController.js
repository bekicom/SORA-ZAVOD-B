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
      // 1️⃣ unit ichidan kategoriya topamiz
      const kategoriya = unit.kategoriyalar.find(
        (k) => k._id.toString() === p.kategoriya_id.toString(),
      );
      if (!kategoriya) continue;

      // 2️⃣ GLOBAL PRODUCT (catalog)
      const globalProduct = await syncGlobalProduct({
        name: kategoriya.nom, // ❗ majburiy
        birlik: p.birlik || "dona",
        category: unit.nom, // masalan: "Pishiriqlar"
      });

      if (!globalProduct || !globalProduct._id) {
        throw new Error("Global product yaratilmadi");
      }

      // 3️⃣ UNIT OMBORIDAN MINUS
      const unitItem = unit.unit_ombor.find(
        (i) => i.kategoriya_id.toString() === p.kategoriya_id.toString(),
      );

      if (unitItem) {
        if (unitItem.miqdor < p.miqdor) {
          throw new Error(
            `${kategoriya.nom} uchun unit omborida yetarli miqdor yo‘q`,
          );
        }
        unitItem.miqdor -= p.miqdor;
      }

      // 4️⃣ MAIN WAREHOUSE KIRIM
      const mainItem = await MainWarehouse.findOne({
        global_product_id: globalProduct._id,
        unit_id: unit._id,
      });

      if (mainItem) {
        mainItem.miqdor += p.miqdor;
        mainItem.kirim_tarix.push({
          miqdor: p.miqdor,
          kiritgan: approved_by || "Admin",
        });
        await mainItem.save();
      } else {
        await MainWarehouse.create({
          global_product_id: globalProduct._id,
          unit_id: unit._id,
          miqdor: p.miqdor,
          birlik: globalProduct.birlik || "dona",
          kirim_tarix: [
            {
              miqdor: p.miqdor,
              kiritgan: approved_by || "Admin",
            },
          ],
        });
      }
    }

    /* =========================
       SAVE
    ========================= */
    await unit.save();

    invoice.status = "approved";
    invoice.approved_by = approved_by || "Admin";
    await invoice.save();

    return res.json({
      success: true,
      message:
        "✅ Faktura tasdiqlandi (unit → main warehouse → global katalog)",
      data: invoice,
    });
  } catch (error) {
    console.error("approveInvoice error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server xatosi",
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

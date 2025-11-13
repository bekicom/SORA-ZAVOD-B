const UnitInvoice = require("../models/UnitInvoice");
const Unit = require("../models/Unit");
const MainWarehouse = require("../models/MainWarehouse");

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

    const invoice = await UnitInvoice.findById(id);
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Faktura topilmadi" });
    }

    if (invoice.status === "approved") {
      return res
        .status(400)
        .json({ success: false, message: "Faktura allaqachon tasdiqlangan" });
    }

    // 🔹 Unitni topamiz
    const unit = await Unit.findById(invoice.unit_id);
    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: "Unit topilmadi" });
    }

    // 🔹 Har bir mahsulotni main omborga kiritamiz
    for (const p of invoice.mahsulotlar) {
      const kategoriya = unit.kategoriyalar.find(
        (k) => k._id.toString() === p.kategoriya_id.toString()
      );

      if (!kategoriya) continue;

      // 🔹 Unit ichki omboridan kamaytiramiz
      const omborItem = unit.unit_ombor.find(
        (item) => item.kategoriya_id.toString() === p.kategoriya_id.toString()
      );
      if (omborItem) {
        omborItem.miqdor = Math.max(omborItem.miqdor - p.miqdor, 0);
      }

      // 🔹 MainWarehouse ga kiritamiz yoki yangilaymiz
      let mainItem = await MainWarehouse.findOne({
        kategoriya_id: p.kategoriya_id,
        unit_id: invoice.unit_id,
      });

      if (mainItem) {
        mainItem.miqdor += p.miqdor;
        mainItem.kirim_tarix.push({
          unit_nomi: unit.nom,
          miqdor: p.miqdor,
          kiritgan: approved_by || "Admin",
        });
        await mainItem.save();
      } else {
        await MainWarehouse.create({
          kategoriya_nomi: kategoriya.nom,
          kategoriya_id: p.kategoriya_id,
          unit_id: invoice.unit_id,
          miqdor: p.miqdor,
          kirim_tarix: [
            {
              unit_nomi: unit.nom,
              miqdor: p.miqdor,
              kiritgan: approved_by || "Admin",
            },
          ],
        });
      }
    }

    await unit.save();

    invoice.status = "approved";
    invoice.approved_by = approved_by || "Admin";
    await invoice.save();

    res.json({
      success: true,
      message: "✅ Faktura tasdiqlandi va mahsulotlar asosiy omborga kiritildi",
      data: invoice,
    });
  } catch (error) {
    console.error("approveInvoice error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
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

const Unit = require("../models/Unit");
const UnitRequest = require("../models/UnitRequest");
const io = global.io;

/* ==========================================================
   📩 1️⃣ So'rov yaratish (oluvchi tomondan)
========================================================== */
exports.createRequest = async (req, res) => {
  try {
    const {
      from_unit_code,
      to_unit_code,
      kategoriya_id,
      kategoriya_nomi,
      miqdor,
    } = req.body;

    const from_unit = await Unit.findOne({ unit_code: from_unit_code });
    const to_unit = await Unit.findOne({ unit_code: to_unit_code });

    if (!from_unit || !to_unit) {
      return res.status(404).json({
        success: false,
        message:
          "Bo'lim topilmadi. from_unit_code yoki to_unit_code noto'g'ri!",
      });
    }

    const request = await UnitRequest.create({
      from_unit: from_unit._id,
      to_unit: to_unit._id,
      kategoriya_id,
      kategoriya_nomi,
      miqdor,
    });

    // 🔹 Faqat to_unit kanaliga yuboramiz
    io.to(`unit_${to_unit.unit_code}`).emit("unit_request", {
      id: request._id,
      from_unit: from_unit.nom,
      from_unit_code: from_unit.unit_code,
      kategoriya_nomi,
      miqdor,
      status: "pending",
      vaqt: new Date().toLocaleString("uz-UZ"),
    });

    console.log(`📨 Socket yuborildi: unit_${to_unit.unit_code} kanaliga`);

    res.status(201).json({
      success: true,
      message: `📨 So'rov ${to_unit.nom} bo'limiga yuborildi`,
      data: request,
    });
  } catch (error) {
    console.error("createRequest error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};

/* ==========================================================
   ✅ 2️⃣ So'rovni tasdiqlash (ombor tekshiruvi bilan)
========================================================== */
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await UnitRequest.findById(id).populate(
      "from_unit to_unit"
    );

    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "So'rov topilmadi" });

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Bu so'rov allaqachon ${request.status} holatida`,
      });
    }

    // 🔹 Beruvchi unitni (to_unit) topamiz
    const giverUnit = await Unit.findById(request.to_unit._id);
    if (!giverUnit) {
      return res
        .status(404)
        .json({ success: false, message: "Beruvchi unit topilmadi" });
    }

    // 🔹 Oluvchi unitni (from_unit) topamiz
    const receiverUnit = await Unit.findById(request.from_unit._id);
    if (!receiverUnit) {
      return res
        .status(404)
        .json({ success: false, message: "Oluvchi unit topilmadi" });
    }

    // 🔹 Omborda mahsulotni izlaymiz
    const item = giverUnit.unit_ombor.find(
      (i) => i.kategoriya_id.toString() === request.kategoriya_id.toString()
    );

    if (!item) {
      return res.status(400).json({
        success: false,
        message: `Beruvchi unit omborida bu mahsulot topilmadi ❌`,
      });
    }

    // 🔹 Yetarlimi?
    if (item.miqdor < request.miqdor) {
      return res.status(400).json({
        success: false,
        message: `Omborda faqat ${item.miqdor} dona mavjud, ${request.miqdor} ta chiqarib bo'lmaydi ❌`,
        available: item.miqdor,
      });
    }

    // 🔹 Beruvchi omboridan ayiramiz
    item.miqdor -= Number(request.miqdor);
    await giverUnit.save();

    // 🔹 Oluvchi omboriga qo'shamiz
    const receiverItem = receiverUnit.unit_ombor.find(
      (i) => i.kategoriya_id.toString() === request.kategoriya_id.toString()
    );

    if (receiverItem) {
      // Agar mahsulot mavjud bo'lsa, miqdorga qo'shamiz
      receiverItem.miqdor += Number(request.miqdor);
    } else {
      // Agar mahsulot yo'q bo'lsa, yangi qo'shamiz
      receiverUnit.unit_ombor.push({
        kategoriya_id: request.kategoriya_id,
        kategoriya_nomi: request.kategoriya_nomi,
        miqdor: Number(request.miqdor),
      });
    }
    await receiverUnit.save();

    // 🔹 So'rov holatini yangilaymiz
    request.status = "approved";
    await request.save();

    // 🔹 So'rov yuborgan tomonga xabar (real-time)
    io.to(`unit_${request.from_unit.unit_code}`).emit("unit_request_approved", {
      id: request._id,
      message: `✅ ${request.to_unit.nom} sizning ${request.kategoriya_nomi} so'rovingizni tasdiqladi`,
      kategoriya_nomi: request.kategoriya_nomi,
      miqdor: request.miqdor,
      from_unit: request.from_unit.nom,
      to_unit: request.to_unit.nom,
      vaqt: new Date().toLocaleString("uz-UZ"),
    });

    console.log(
      `✅ Socket yuborildi: unit_${request.from_unit.unit_code} kanaliga`
    );

    // 🔹 Beruvchi tomonga ham xabar (ixtiyoriy)
    io.to(`unit_${request.to_unit.unit_code}`).emit("unit_request_processed", {
      id: request._id,
      message: `✅ Siz ${request.from_unit.nom}ga ${request.kategoriya_nomi} jo'natdingiz`,
      kategoriya_nomi: request.kategoriya_nomi,
      miqdor: request.miqdor,
      omborda_qoldi: item.miqdor,
      vaqt: new Date().toLocaleString("uz-UZ"),
    });

    res.json({
      success: true,
      message: "✅ So'rov tasdiqlandi va mahsulot o'tkazildi",
      data: {
        kategoriya: request.kategoriya_nomi,
        miqdor: request.miqdor,
        beruvchi_omborida_qoldi: item.miqdor,
        oluvchi_omborida: receiverItem ? receiverItem.miqdor : request.miqdor,
      },
    });
  } catch (error) {
    console.error("approveRequest error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};

/* ==========================================================
   ❌ 3️⃣ So'rovni rad etish
========================================================== */
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await UnitRequest.findById(id).populate(
      "from_unit to_unit"
    );

    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "So'rov topilmadi" });

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Bu so'rov allaqachon ${request.status} holatida`,
      });
    }

    request.status = "rejected";
    await request.save();

    io.to(`unit_${request.from_unit.unit_code}`).emit("unit_request_rejected", {
      id: request._id,
      message: `❌ ${request.to_unit.nom} sizning so'rovingizni rad etdi`,
      kategoriya_nomi: request.kategoriya_nomi,
      miqdor: request.miqdor,
      vaqt: new Date().toLocaleString("uz-UZ"),
    });

    console.log(
      `❌ Socket yuborildi: unit_${request.from_unit.unit_code} kanaliga`
    );

    res.json({ success: true, message: "❌ So'rov rad etildi", data: request });
  } catch (error) {
    console.error("rejectRequest error:", error);
    res.status(500).json({ success: false, message: "Server xatolik" });
  }
};

/* ==========================================================
   📋 4️⃣ Ma'lum unitga kelgan so'rovlarni olish
========================================================== */
exports.getRequestsForUnit = async (req, res) => {
  try {
    const { unit_code } = req.params;
    const unit = await Unit.findOne({ unit_code });
    if (!unit)
      return res
        .status(404)
        .json({ success: false, message: "Bo'lim topilmadi" });

    const requests = await UnitRequest.find({ to_unit: unit._id })
      .populate("from_unit", "nom unit_code")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("getRequestsForUnit error:", error);
    res.status(500).json({ success: false, message: "Server xatolik" });
  }
};


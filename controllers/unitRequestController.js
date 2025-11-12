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
        .json({ success: false, message: "So‘rov topilmadi" });

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Bu so‘rov allaqachon ${request.status} holatida`,
      });
    }

    // 🔹 So‘rovni "approved" holatiga o‘tkazamiz (lekin mahsulot hali chiqmaydi)
    request.status = "approved";
    await request.save();

    // 🔹 So‘rov yuborgan tomonga socket orqali bildirish
    io.to(`unit_${request.from_unit.unit_code}`).emit("unit_request_approved", {
      id: request._id,
      message: `✅ ${request.to_unit.nom} sizning ${request.kategoriya_nomi} so‘rovingizni tayyorladi`,
      kategoriya_nomi: request.kategoriya_nomi,
      miqdor: request.miqdor,
      vaqt: new Date().toLocaleString("uz-UZ"),
    });

    res.json({
      success: true,
      message: "✅ So‘rov tasdiqlandi. Mahsulot jo‘natishga tayyor holatda.",
      data: {
        kategoriya: request.kategoriya_nomi,
        miqdor: request.miqdor,
        holat: "approved",
      },
    });
  } catch (error) {
    console.error("approveRequest error:", error);
    res
      .status(500)
      .json({
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
   📋 4️⃣ Ma’lum unitga kelgan so‘rovlarni olish (filtr bilan)
========================================================== */
exports.getRequestsForUnit = async (req, res) => {
  try {
    const { unit_code } = req.params;
    const { status } = req.query; // 🔹 Filtr uchun query param

    // 🔹 Unitni topamiz
    const unit = await Unit.findOne({ unit_code });
    if (!unit)
      return res.status(404).json({ success: false, message: "Bo‘lim topilmadi" });

    // 🔹 Filtr obyektini tayyorlaymiz
    const filter = { to_unit: unit._id };
    if (status) {
      // Faqat mavjud enum qiymatlarni ruxsat beramiz
      const validStatuses = ["pending", "approved", "rejected", "received"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Noto‘g‘ri status qiymati. Faqat quyidagilarni ishlatish mumkin: ${validStatuses.join(", ")}`,
        });
      }
      filter.status = status;
    }

    // 🔹 So‘rovlarni topamiz
    const requests = await UnitRequest.find(filter)
      .populate("from_unit", "nom unit_code")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      unit: { id: unit._id, nom: unit.nom, code: unit.unit_code },
      status_filter: status || "all",
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("getRequestsForUnit error:", error);
    res.status(500).json({ success: false, message: "Server xatolik", error: error.message });
  }
};

exports.receiveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await UnitRequest.findById(id).populate(
      "from_unit to_unit"
    );

    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "So‘rov topilmadi" });

    if (request.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Faqat 'approved' holatdagi so‘rovni qabul qilish mumkin",
      });
    }

    const giverUnit = await Unit.findById(request.to_unit._id);
    const receiverUnit = await Unit.findById(request.from_unit._id);

    if (!giverUnit || !receiverUnit)
      return res.status(404).json({
        success: false,
        message: "Beruvchi yoki oluvchi unit topilmadi",
      });

    // 🔹 Beruvchi omboridan mahsulotni topamiz
    const item = giverUnit.unit_ombor.find(
      (i) => i.kategoriya_id.toString() === request.kategoriya_id.toString()
    );

    if (!item)
      return res.status(400).json({
        success: false,
        message: `Beruvchi unit omborida bu mahsulot topilmadi ❌`,
      });

    // 🔹 Yetarlimi?
    if (item.miqdor < request.miqdor)
      return res.status(400).json({
        success: false,
        message: `Omborda faqat ${item.miqdor} dona mavjud, ${request.miqdor} ta chiqarib bo‘lmaydi ❌`,
      });

    // 🔹 Beruvchi omboridan kamaytirish
    item.miqdor -= Number(request.miqdor);
    await giverUnit.save();

    // 🔹 Oluvchi omboriga qo‘shish
    const receiverItem = receiverUnit.unit_ombor.find(
      (i) => i.kategoriya_id.toString() === request.kategoriya_id.toString()
    );

    if (receiverItem) {
      receiverItem.miqdor += Number(request.miqdor);
    } else {
      receiverUnit.unit_ombor.push({
        kategoriya_id: request.kategoriya_id,
        kategoriya_nomi: request.kategoriya_nomi,
        miqdor: Number(request.miqdor),
      });
    }
    await receiverUnit.save();

    // 🔹 So‘rov holatini "received" qilib yangilaymiz
    request.status = "received";
    await request.save();

    // 🔹 Socket orqali bildirish
    io.to(`unit_${request.to_unit.unit_code}`).emit("unit_request_received", {
      id: request._id,
      message: `📦 ${request.from_unit.nom} ${request.kategoriya_nomi} mahsulotini qabul qilib oldi.`,
      kategoriya_nomi: request.kategoriya_nomi,
      miqdor: request.miqdor,
      vaqt: new Date().toLocaleString("uz-UZ"),
    });

    res.json({
      success: true,
      message: "✅ Mahsulot qabul qilindi va omborlar yangilandi",
      data: {
        kategoriya: request.kategoriya_nomi,
        miqdor: request.miqdor,
        beruvchi_omborida_qoldi: item.miqdor,
        oluvchi_omborida: receiverItem ? receiverItem.miqdor : request.miqdor,
      },
    });
  } catch (error) {
    console.error("receiveRequest error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Server xatolik",
        error: error.message,
      });
  }
};

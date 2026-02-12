const WarehouseRoom = require("../models/WarehouseRoom");


/* 🧱 Xona yaratish */
exports.createRoom = async (req, res) => {
  try {
    const { nom } = req.body;
    if (!nom)
      return res
        .status(400)
        .json({ success: false, message: "Xona nomi kiritilishi shart" });

    const room = new WarehouseRoom({ nom });
    await room.save();

    res.status(201).json({
      success: true,
      message: "Xona yaratildi ✅",
      data: room,
    });
  } catch (err) {
    console.error("createRoom error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* 📋 Barcha xonalarni olish (chiqim/kirimlarsiz) */
exports.getRooms = async (req, res) => {
  try {
    const rooms = await WarehouseRoom.find({}, "-chiqimlar -kirimlar");
    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (err) {
    console.error("getRooms error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* 🔍 Bitta xonani ID orqali olish (chiqim/kirimlarsiz) */
exports.getRoomById = async (req, res) => {
  try {
    const room = await WarehouseRoom.findById(
      req.params.id,
      "-chiqimlar -kirimlar", // 🔹 bu joy muhim — chiqim/kirimlarni olib tashlaydi
    );

    if (!room)
      return res
        .status(404)
        .json({ success: false, message: "Ombor xonasi topilmadi" });

    res.json({
      success: true,
      message: `${room.nom} haqida ma’lumot`,
      data: room,
    });
  } catch (err) {
    console.error("getRoomById error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

exports.kirim = async (req, res) => {
  try {
    const { mahsulot, miqdor, birlik, izoh } = req.body;
    if (!mahsulot || !miqdor)
      return res
        .status(400)
        .json({ success: false, message: "Mahsulot va miqdor shart" });

    const room = await WarehouseRoom.findById(req.params.id);
    if (!room)
      return res
        .status(404)
        .json({ success: false, message: "Xona topilmadi" });

    const existing = room.mahsulotlar.find((m) => m.nom === mahsulot);

    if (existing) {
      existing.miqdor += miqdor;
      existing.oxirgi_ozgarish = new Date();
    } else {
      room.mahsulotlar.push({
        nom: mahsulot,
        miqdor,
        birlik: birlik || "dona",
        kirim_sana: new Date(),
      });
    }

    // 🔹 Kirim tarixiga yozamiz
    room.kirimlar.push({
      mahsulot,
      miqdor,
      birlik: birlik || "dona",
      izoh: izoh || "Omborga kirim",
      sana: new Date(),
    });

    // ✅ LOCAL DB SAQLANADI
    await room.save();

    // 🌍 GLOBAL DB GA YUBORAMIZ
    await syncToGlobal(mahsulot, miqdor);

    res.json({
      success: true,
      message: `${mahsulot} uchun ${miqdor} ${
        birlik || "dona"
      } kirim qilindi ✅`,
      data: {
        xona: room.nom,
        mahsulot,
        miqdor,
        birlik: birlik || "dona",
      },
    });
  } catch (err) {
    console.error("kirim error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* 📤 Chiqim */
exports.chiqim = async (req, res) => {
  try {
    const { mahsulot, miqdor, birlik, izoh } = req.body;

    if (!mahsulot || !miqdor)
      return res.status(400).json({
        success: false,
        message: "Mahsulot nomi va miqdori shart",
      });

    const room = await WarehouseRoom.findById(req.params.id);
    if (!room)
      return res.status(404).json({
        success: false,
        message: "Xona topilmadi",
      });

    const existing = room.mahsulotlar.find((m) => m.nom === mahsulot);
    if (!existing)
      return res.status(404).json({
        success: false,
        message: "Mahsulot topilmadi",
      });

    if (existing.miqdor < miqdor)
      return res.status(400).json({
        success: false,
        message: `Omborda yetarli ${mahsulot} mavjud emas (${existing.miqdor} ${
          existing.birlik || "dona"
        } qoldi)`,
      });

    // 🔻 MIQDOR AYIRAMIZ
    existing.miqdor -= miqdor;
    existing.oxirgi_ozgarish = new Date();

    const usedUnit = birlik || existing.birlik || "dona";

    // 📦 CHIQIM TARIXIGA YOZAMIZ
    room.chiqimlar.push({
      mahsulot,
      miqdor,
      birlik: usedUnit,
      izoh: izoh || "Ishlab chiqarish uchun chiqim",
      sana: new Date(),
    });

    await room.save();

    // ✅ RESPONSE
    res.json({
      success: true,
      message: `${mahsulot} uchun ${miqdor} ${usedUnit} chiqim qilindi ✅`,
      data: {
        xona: room.nom,
        mahsulot,
        miqdor,
        birlik: usedUnit,
        qolgan_miqdor: existing.miqdor,
        qolgan_birlik: existing.birlik || usedUnit,
        izoh: izoh || "Ishlab chiqarish uchun chiqim",
      },
    });
  } catch (err) {
    console.error("chiqim error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

/* 📜 Chiqimlar tarixini olish */
exports.getChiqimlar = async (req, res) => {
  try {
    const room = await WarehouseRoom.findById(req.params.id);
    if (!room)
      return res
        .status(404)
        .json({ success: false, message: "Xona topilmadi" });

    res.json({
      success: true,
      count: room.chiqimlar.length,
      data: room.chiqimlar,
    });
  } catch (err) {
    console.error("getChiqimlar error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* 📜 Kirimlar tarixini olish */
exports.getKirimlar = async (req, res) => {
  try {
    const room = await WarehouseRoom.findById(req.params.id);
    if (!room)
      return res
        .status(404)
        .json({ success: false, message: "Xona topilmadi" });

    res.json({
      success: true,
      count: room.kirimlar.length,
      data: room.kirimlar,
    });
  } catch (err) {
    console.error("getKirimlar error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* 📦 Ombordagi barcha mahsulot nomlarini olish (unique) */
exports.getAllProductNames = async (req, res) => {
  try {
    const rooms = await WarehouseRoom.find({}, "mahsulotlar.nom");

    const productSet = new Set();

    rooms.forEach((room) => {
      room.mahsulotlar.forEach((m) => {
        if (m.nom) {
          productSet.add(m.nom);
        }
      });
    });

    const products = Array.from(productSet);

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (err) {
    console.error("getAllProductNames error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

/* ===================================================
   📊 Zavod omborlari bo‘yicha umumiy qoldiq (SUMMARY)
   GET /factory/stock/summary
=================================================== */
exports.getFactoryStockSummary = async (req, res) => {
  try {
    const rooms = await WarehouseRoom.find({ status: true }).lean();

    const summaryMap = new Map();

    for (const room of rooms) {
      for (const item of room.mahsulotlar || []) {
        if (!item.nom) continue;

        if (!summaryMap.has(item.nom)) {
          summaryMap.set(item.nom, {
            mahsulot: item.nom,
            birlik: item.birlik || "dona",
            jami_miqdor: 0,
            joylashuvlar: [],
          });
        }

        const row = summaryMap.get(item.nom);
        row.jami_miqdor += Number(item.miqdor || 0);

        row.joylashuvlar.push({
          xona: room.nom,
          miqdor: item.miqdor,
        });
      }
    }

    res.json({
      success: true,
      count: summaryMap.size,
      data: Array.from(summaryMap.values()),
    });
  } catch (err) {
    console.error("getFactoryStockSummary error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

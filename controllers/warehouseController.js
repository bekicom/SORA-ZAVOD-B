const WarehouseRoom = require("../models/WarehouseRoom");
const GlobalSyncQueue = require("../models/GlobalSyncQueue");

function resolveProductType(roomName, requestedType) {
  if (requestedType && ["tayyor", "yarim_tayyor"].includes(requestedType)) {
    return requestedType;
  }

  return roomName === "Tayyor mahsulotlar" ? "tayyor" : "yarim_tayyor";
}

function resolveSyncCategory(productType) {
  return productType === "tayyor" ? "Tayyor mahsulot" : "Yarim tayyor";
}

/* 🧱 Xona yaratish */
exports.createRoom = async (req, res) => {
  try {
    const { nom } = req.body;

    if (!nom) {
      return res.status(400).json({
        success: false,
        message: "Xona nomi kiritilishi shart",
      });
    }

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

/* 📋 Barcha xonalar */
exports.getRooms = async (req, res) => {
  try {
    const rooms = await WarehouseRoom.find({}, "-chiqimlar -kirimlar");
    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (err) {
    console.error("getRooms error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* 🔍 Bitta xona */
exports.getRoomById = async (req, res) => {
  try {
    const room = await WarehouseRoom.findById(
      req.params.id,
      "-chiqimlar -kirimlar",
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

/* 📥 Kirim */
exports.kirim = async (req, res) => {
  try {
    const { mahsulot, miqdor, birlik, izoh, price, turi } = req.body;

    if (!mahsulot || !miqdor) {
      return res.status(400).json({
        success: false,
        message: "Mahsulot va miqdor shart",
      });
    }

    const room = await WarehouseRoom.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Xona topilmadi",
      });
    }

    const existing = room.mahsulotlar.find((m) => m.nom === mahsulot);
    const incomingPrice = Number(price);
    const hasIncomingPrice =
      price !== undefined && price !== null && price !== "";

    if (
      hasIncomingPrice &&
      (Number.isNaN(incomingPrice) || incomingPrice < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "price 0 yoki undan katta son bo‘lishi kerak",
      });
    }

    if (existing) {
      existing.miqdor += Number(miqdor);
      existing.oxirgi_ozgarish = new Date();
      existing.turi = resolveProductType(room.nom, turi);
      if (hasIncomingPrice) {
        existing.price = incomingPrice;
      }
    } else {
      room.mahsulotlar.push({
        nom: mahsulot,
        turi: resolveProductType(room.nom, turi),
        miqdor: Number(miqdor),
        birlik: birlik || "dona",
        price: hasIncomingPrice ? incomingPrice : 0,
        kirim_sana: new Date(),
      });
    }

    room.kirimlar.push({
      mahsulot,
      miqdor: Number(miqdor),
      birlik: birlik || "dona",
      izoh: izoh || "Omborga kirim",
      sana: new Date(),
    });

    await room.save();

    if (hasIncomingPrice) {
      const savedProduct = room.mahsulotlar.find((m) => m.nom === mahsulot);
      if (savedProduct) {
        await GlobalSyncQueue.create({
          name: savedProduct.nom,
          birlik: savedProduct.birlik || "dona",
          category: resolveSyncCategory(
            resolveProductType(room.nom, savedProduct.turi),
          ),
          qty: Number(savedProduct.miqdor || 0),
          price: Number(savedProduct.price || 0),
          product_type: resolveProductType(room.nom, savedProduct.turi),
          source: "WAREHOUSE",
          status: "pending",
        });
      }
    }

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
        price: hasIncomingPrice ? incomingPrice : existing?.price || 0,
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

    if (!mahsulot || !miqdor) {
      return res.status(400).json({
        success: false,
        message: "Mahsulot nomi va miqdori shart",
      });
    }

    const room = await WarehouseRoom.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Xona topilmadi",
      });
    }

    const existing = room.mahsulotlar.find((m) => m.nom === mahsulot);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Mahsulot topilmadi",
      });
    }

    if (existing.miqdor < miqdor) {
      return res.status(400).json({
        success: false,
        message: `Omborda yetarli ${mahsulot} mavjud emas (${existing.miqdor} ${
          existing.birlik || "dona"
        } qoldi)`,
      });
    }

    existing.miqdor -= Number(miqdor);
    existing.oxirgi_ozgarish = new Date();

    const usedUnit = birlik || existing.birlik || "dona";

    room.chiqimlar.push({
      mahsulot,
      miqdor: Number(miqdor),
      birlik: usedUnit,
      izoh: izoh || "Ishlab chiqarish uchun chiqim",
      sana: new Date(),
    });

    await room.save();

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

/* 📜 Kirimlar */
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

/* ✏️ Mahsulot priceini yangilash + global sync queue */
exports.updateProductPrice = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const { price } = req.body;

    if (price === undefined || price === null || price === "") {
      return res.status(400).json({
        success: false,
        message: "price kiritilishi shart",
      });
    }

    const parsedPrice = Number(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "price 0 yoki undan katta son bo‘lishi kerak",
      });
    }

    const room = await WarehouseRoom.findById(id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Xona topilmadi",
      });
    }

    const product = room.mahsulotlar.id(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Mahsulot topilmadi",
      });
    }

    product.price = parsedPrice;
    product.turi = resolveProductType(room.nom, product.turi);
    product.oxirgi_ozgarish = new Date();

    await room.save();

    await GlobalSyncQueue.create({
      name: product.nom,
      birlik: product.birlik || "dona",
      category: resolveSyncCategory(product.turi),
      qty: Number(product.miqdor || 0),
      price: Number(product.price || 0),
      product_type: product.turi,
      source: "WAREHOUSE",
      status: "pending",
    });

    res.json({
      success: true,
      message:
        "Mahsulot pricei yangilandi va global sync queue ga yuborildi ✅",
      data: {
        xona_id: room._id,
        xona_nomi: room.nom,
        product_id: product._id,
        mahsulot: product.nom,
        turi: product.turi,
        price: product.price,
        birlik: product.birlik,
        miqdor: product.miqdor,
      },
    });
  } catch (err) {
    console.error("updateProductPrice error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* ✏️ Room ichidagi mahsulotni to‘liq tahrirlash */
exports.updateRoomProduct = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const { nom, miqdor, birlik, price, turi } = req.body;

    const room = await WarehouseRoom.findById(id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Xona topilmadi",
      });
    }

    const product = room.mahsulotlar.id(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Mahsulot topilmadi",
      });
    }

    if (nom !== undefined) {
      const cleanName = String(nom).trim();
      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message: "nom bo‘sh bo‘lmasligi kerak",
        });
      }

      const duplicate = room.mahsulotlar.find(
        (p) =>
          p._id.toString() !== productId &&
          p.nom?.toLowerCase() === cleanName.toLowerCase(),
      );

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Bu nomli mahsulot ushbu xonada allaqachon mavjud",
        });
      }

      product.nom = cleanName;
    }

    if (miqdor !== undefined) {
      const qty = Number(miqdor);
      if (Number.isNaN(qty) || qty < 0) {
        return res.status(400).json({
          success: false,
          message: "miqdor 0 yoki undan katta bo‘lishi kerak",
        });
      }
      product.miqdor = qty;
    }

    if (birlik !== undefined) {
      const cleanUnit = String(birlik).trim();
      if (!cleanUnit) {
        return res.status(400).json({
          success: false,
          message: "birlik bo‘sh bo‘lmasligi kerak",
        });
      }
      product.birlik = cleanUnit;
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          success: false,
          message: "price 0 yoki undan katta son bo‘lishi kerak",
        });
      }
      product.price = parsedPrice;
    }

    product.turi = resolveProductType(room.nom, turi || product.turi);
    product.oxirgi_ozgarish = new Date();

    await room.save();

    await GlobalSyncQueue.create({
      name: product.nom,
      birlik: product.birlik || "dona",
      category: resolveSyncCategory(product.turi),
      qty: Number(product.miqdor || 0),
      price: Number(product.price || 0),
      product_type: product.turi,
      source: "WAREHOUSE",
      status: "pending",
    });

    res.json({
      success: true,
      message: "Mahsulot ma’lumotlari yangilandi ✅",
      data: {
        xona_id: room._id,
        xona_nomi: room.nom,
        product_id: product._id,
        nom: product.nom,
        miqdor: product.miqdor,
        birlik: product.birlik,
        turi: product.turi,
        price: product.price || 0,
        oxirgi_ozgarish: product.oxirgi_ozgarish,
      },
    });
  } catch (err) {
    console.error("updateRoomProduct error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
};

/* 📜 Chiqimlar */
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
            turi: item.turi || resolveProductType(room.nom),
            price: Number(item.price || 0),
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
          price: Number(item.price || 0),
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

// controllers/warehouseOrderController.js
const WarehouseOrder = require("../models/WarehouseOrder");
const Recipe = require("../models/Recipe");
const WarehouseRoom = require("../models/WarehouseRoom");

// ✅ IO ni global dan olish
function getIO() {
  return global.io;
}

// 🔹 1. Yangi zakas yaratish (Unit tomonidan)
exports.createOrder = async (req, res) => {
  try {
    const { unit_id, kategoriya_id, quantity, requested_by } = req.body;

    console.log("📥 Kelgan ma'lumotlar:", {
      unit_id,
      kategoriya_id,
      quantity,
      requested_by,
    });

    // 🔹 Tex kartani topamiz
    const recipe = await Recipe.findOne({ kategoriya_id });
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: "Tex karta topilmadi!",
        kategoriya_id,
      });
    }

    console.log("✅ Recipe topildi:", {
      _id: recipe._id,
      kategoriya_nomi: recipe.kategoriya_nomi,
      mahsulotlar_soni: recipe.mahsulotlar?.length,
    });

    // 🔹 Har bir ingredient bo'yicha hisob-kitob
    const recipe_items = recipe.mahsulotlar.map((m) => ({
      nom: m.nom,
      birlik: m.birlik,
      bazaviy_miqdor: m.miqdor,
      umumiy_miqdor: (m.miqdor * quantity) / recipe.umumiy_hajm,
      yigilgan_miqdor: 0,
      ombor_joylashuvi: "",
    }));

    // 🔹 Yangi zakas yaratish
    let order = await WarehouseOrder.create({
      unit_id,
      kategoriya_id: recipe.kategoriya_id,
      kategoriya_nomi: recipe.kategoriya_nomi || "Noma'lum kategoriya",
      quantity,
      recipe_items,
      requested_by,
    });

    // 🔹 Adminlarga socket orqali bildirish
    const io = getIO();
    if (io) {
      console.log("📢 Socket orqali new_order yuborildi!");
      io.to("admins").emit("new_order", order.toObject());
    }

    res.status(201).json({
      success: true,
      message: "Zakas yaratildi!",
      data: order,
    });
  } catch (error) {
    console.error("❌ Zakas yaratishda xatolik:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};

// 🔹 Zakas tasdiqlanganda omborchilarga bildirish
exports.approveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;

    const order = await WarehouseOrder.findById(id).populate(
      "unit_id",
      "nom unit_code"
    );
    if (!order)
      return res.status(404).json({
        success: false,
        message: "Zakas topilmadi",
      });

    if (order.status === "approved")
      return res.status(400).json({
        success: false,
        message: "Bu zakas allaqachon tasdiqlangan ✅",
      });

    order.status = "approved";
    order.approved_by = approved_by || "Admin";
    await order.save();

    // 🔹 SOCKET: YANGI ZAKAS OMBORCHILARGA YUBORILADI
    const io = getIO();
    if (io) {
      const orderData = {
        order_id: order._id,
        kategoriya_nomi: order.kategoriya_nomi,
        quantity: order.quantity,
        unit_nomi: order.unit_id?.nom || "Noma'lum",
        unit_code: order.unit_id?.unit_code || "",
        approved_by: order.approved_by,
        created_at: order.createdAt,
        recipe_items: order.recipe_items,
        timestamp: new Date().toISOString(),
      };

      // 🔹 Omborchilarga yangi zakas haqida bildirish
      io.to("warehouse").emit("new_approved_order", orderData);

      // 🔹 Adminlarga ham bildirish
      io.to("admins").emit("order_approved", orderData);

      console.log("📢 Yangi zakas omborchilarga yuborildi:", order._id);
    }

    res.status(200).json({
      success: true,
      message: "✅ Zakas tasdiqlandi!",
      data: order,
    });
  } catch (error) {
    console.error("❌ Tasdiqlashda xatolik:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};

// 🔹 3. Barcha zakaslarni olish (filtr bilan)
exports.getOrders = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) {
      const validStatuses = [
        "pending",
        "approved",
        "collecting",
        "completed",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Noto'g'ri status qiymati",
        });
      }
      filter.status = status;
    }

    const orders = await WarehouseOrder.find(filter)
      .populate("unit_id", "nom unit_code qavat")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("❌ Zakaslarni olishda xatolik:", error);
    res.status(500).json({
      success: false,
      message: "Server xatolik",
      error: error.message,
    });
  }
};

// 🔹 4. OMBORCHI: Tasdiqlangan zakaslarni olish
exports.getApprovedOrdersForSkladchi = async (req, res) => {
  try {
    // ?status=approved yoki ?status=pending, yoki bir nechta: ?status=approved,confirmed
    let { status } = req.query;

    // Agar status kelmasa — default barcha statuslarni oladi
    const allowedStatuses = [
      "pending",
      "approved",
      "confirmed",
      "completed",
      "cancelled",
    ];

    let statusFilter = {};

    if (status) {
      // Bir nechta status bo‘lsa, massivga aylantirib olamiz
      const statusArray = status.split(",").map((s) => s.trim());

      // Faqat ruxsat berilgan statuslar qoldiriladi
      const validStatus = statusArray.filter((s) =>
        allowedStatuses.includes(s)
      );

      if (validStatus.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Noto‘g‘ri status!",
        });
      }

      statusFilter = { status: { $in: validStatus } };
    }

    const orders = await WarehouseOrder.find(statusFilter)
      .populate("unit_id", "nom unit_code qavat turi")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "Zakaslar ro‘yxati",
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("getApprovedOrders error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

// 🔹 5. OMBORCHI: Chop etish uchun zakas ma'lumotlari
exports.getOrderForPrint = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await WarehouseOrder.findById(id).populate(
      "unit_id",
      "nom unit_code qavat turi"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Zakas topilmadi",
      });
    }

    // 🔹 Ombordagi ingredientlarning joylashuvini topamiz
    const ingredientlarWithLocation = await Promise.all(
      order.recipe_items.map(async (item) => {
        const room = await WarehouseRoom.findOne({
          "mahsulotlar.nom": item.nom,
          "mahsulotlar.miqdor": { $gte: item.umumiy_miqdor },
        }).select("nom");

        return {
          ...item.toObject(),
          ombor_joylashuvi: room ? room.nom : "Topilmadi",
        };
      })
    );

    const printData = {
      zakas_id: order._id,
      zakas_sanasi: order.createdAt.toLocaleString("uz-UZ"),
      unit_nomi: order.unit_id.nom,
      unit_kodi: order.unit_id.unit_code,
      unit_qavati: order.unit_id.qavat,
      mahsulot_nomi: order.kategoriya_nomi,
      mahsulot_miqdori: order.quantity,
      ingredientlar: ingredientlarWithLocation,
      holati: order.status,
      so_ragan: order.requested_by,
      tasdiqlagan: order.approved_by,
    };

    res.json({
      success: true,
      message: "Chop etish uchun zakas ma'lumotlari",
      data: printData,
    });
  } catch (error) {
    console.error("getOrderForPrint error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

// controllers/warehouseOrderController.js - confirmOrder funksiyasi

// 🔹 OMBORCHI: Zakasni tasdiqlash va avtomatik yig'ish
exports.confirmOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmed_by } = req.body;

    const order = await WarehouseOrder.findById(id).populate(
      "unit_id",
      "nom unit_code"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Zakas topilmadi",
      });
    }

    if (order.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Faqat admin tasdiqlagan zakasni tasdiqlash mumkin",
      });
    }

    console.log("🔹 Zakas tasdiqlanmoqda...", order._id);

    // 🔹 Zakasni "confirmed" holatiga o'tkazamiz
    order.status = "confirmed";
    order.confirmed_by = confirmed_by;

    // 🔹 AVTOMATIK: Barcha ingredientlarni yig'amiz
    const collectionResults = [];

    for (const ingredient of order.recipe_items) {
      try {
        console.log(`🔹 Ingredient yig'ilyapti: ${ingredient.nom}`);

        // 🔹 Ombordan ingredientni topamiz
        const room = await WarehouseRoom.findOne({
          "mahsulotlar.nom": ingredient.nom,
          "mahsulotlar.miqdor": { $gte: ingredient.umumiy_miqdor },
        });

        if (room) {
          const product = room.mahsulotlar.find(
            (p) => p.nom === ingredient.nom
          );

          if (product && product.miqdor >= ingredient.umumiy_miqdor) {
            // 🔹 Chiqim qilamiz
            product.miqdor -= ingredient.umumiy_miqdor;
            product.oxirgi_ozgarish = new Date();

            room.chiqimlar.push({
              mahsulot: ingredient.nom,
              miqdor: ingredient.umumiy_miqdor,
              izoh: `${order.kategoriya_nomi} zakasi uchun avtomatik chiqim`,
              sana: new Date(),
            });

            await room.save();

            // 🔹 Ingredientga yig'ilgan miqdorni qo'shamiz
            ingredient.yigilgan_miqdor = ingredient.umumiy_miqdor;
            ingredient.ombor_joylashuvi = room.nom;

            collectionResults.push({
              ingredient: ingredient.nom,
              miqdor: ingredient.umumiy_miqdor,
              birlik: ingredient.birlik,
              ombor: room.nom,
              status: "success",
            });

            console.log(
              `✅ ${ingredient.nom} yig'ildi: ${ingredient.umumiy_miqdor} ${ingredient.birlik}`
            );
          } else {
            collectionResults.push({
              ingredient: ingredient.nom,
              status: "error",
              message: `Omborda yetarli ${ingredient.nom} yo'q (Mavjud: ${
                product?.miqdor || 0
              }, Kerak: ${ingredient.umumiy_miqdor})`,
            });
            console.log(`❌ ${ingredient.nom} yetarli emas`);
          }
        } else {
          collectionResults.push({
            ingredient: ingredient.nom,
            status: "error",
            message: `Omborda ${ingredient.nom} topilmadi`,
          });
          console.log(`❌ ${ingredient.nom} omborda topilmadi`);
        }
      } catch (error) {
        collectionResults.push({
          ingredient: ingredient.nom,
          status: "error",
          message: error.message,
        });
        console.error(`❌ ${ingredient.nom} yig'ishda xato:`, error.message);
      }
    }

    // 🔹 Agar barcha ingredientlar muvaffaqiyatli yig'ilsa, zakasni completed qilamiz
    const allSuccess = collectionResults.every(
      (result) => result.status === "success"
    );

    if (allSuccess) {
      order.status = "completed";
      order.completed_at = new Date();
      console.log("✅ Barcha ingredientlar yig'ildi - zakas completed");
    }

    await order.save();
    console.log("🔹 Zakas saqlandi:", order.status);

    // 🔹 SOCKET: Barchaga yangilangan holat haqida bildirish
    const io = getIO();
    if (io) {
      io.emit("order_confirmed", {
        order_id: order._id,
        status: order.status,
        confirmed_by: order.confirmed_by,
        collection_results: collectionResults,
        timestamp: new Date().toISOString(),
      });

      console.log("📢 Socket orqali yangilangan holat yuborildi");

      // 🔹 Unitga ham bildirish
      if (order.unit_id?.unit_code) {
        io.to(`unit_${order.unit_id.unit_code}`).emit("order_in_progress", {
          order_id: order._id,
          message: "Zakas omborda yig'ilyapti",
          kategoriya_nomi: order.kategoriya_nomi,
          status: order.status,
        });
      }
    }

    res.json({
      success: true,
      message: allSuccess
        ? "✅ Zakas tasdiqlandi va barcha ingredientlar yig'ildi"
        : "⚠️ Zakas tasdiqlandi, lekin ba'zi ingredientlar yig'ilmadi",
      data: {
        order: {
          _id: order._id,
          status: order.status,
          confirmed_by: order.confirmed_by,
          recipe_items: order.recipe_items,
        },
        collection_results: collectionResults,
      },
    });
  } catch (error) {
    console.error("❌ confirmOrder error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: error.message,
    });
  }
};

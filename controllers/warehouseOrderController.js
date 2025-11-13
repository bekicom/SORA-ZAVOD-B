// warehouseOrderController.js
const WarehouseOrder = require("../models/WarehouseOrder");
const Recipe = require("../models/Recipe");

// ✅ IO ni global dan yoki app dan olish
function getIO() {
  return global.io;
}

// 🔹 Yangi zakas yaratish
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

    // 🔹 Adminlarga yuborish
    const io = getIO();
    if (io) {
      console.log("📢 Socket orqali new_order yuborildi!");
      console.log("📦 Order ma'lumotlari:", {
        _id: order._id,
        kategoriya_nomi: order.kategoriya_nomi,
        quantity: order.quantity,
        status: order.status,
      });

      // ✅ Faqat adminlarga yuborish
      io.to("admins").emit("new_order", order.toObject());

      // ✅ Yoki barcha ulangan socketlarga
      // io.emit("new_order", order.toObject());
    } else {
      console.warn("⚠️ IO obyekti topilmadi!");
    }

    res.status(201).json({
      message: "Zakas yaratildi!",
      order: order.toObject(),
    });
  } catch (error) {
    console.error("❌ Zakas yaratishda xatolik:", error);
    res.status(500).json({
      message: "Server xatolik",
      error: error.message,
    });
  }
};

// 🔹 Zakasni tasdiqlash (admin)
exports.approveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;

    const order = await WarehouseOrder.findById(id);
    if (!order) return res.status(404).json({ message: "Zakas topilmadi" });

    if (order.status === "approved")
      return res
        .status(400)
        .json({ message: "Bu zakas allaqachon tasdiqlangan ✅" });

    order.status = "approved";
    order.approved_by = approved_by || "Admin";
    await order.save();

    const io = getIO();
    if (io) {
      console.log("📢 Order tasdiqlandi, socketga yuborildi!");

      // ✅ Barcha kanalga yuborish
      io.emit("order_approved", order.toObject());

      // ✅ yoki faqat ombor kanaliga
      // io.to("warehouse").emit("order_approved", order.toObject());
    }

    res.status(200).json({ message: "✅ Zakas tasdiqlandi!", order });
  } catch (error) {
    console.error("❌ Tasdiqlashda xatolik:", error);
    res.status(500).json({ message: "Server xatolik", error: error.message });
  }
};

// 🔹 Barcha zakaslarni olish
// 🔹 Zakaslarni status bo'yicha olish
exports.getOrders = async (req, res) => {
  try {
    const { status } = req.query; // ?status=pending

    const filter = {};
    if (status) {
      // faqat kiritilgan status bo‘yicha filtr
      const validStatuses = ["pending", "approved", "sent", "completed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Noto‘g‘ri status qiymati",
        });
      }
      filter.status = status;
    }

    const orders = await WarehouseOrder.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Kategoriya nomini qo‘shamiz
    for (let o of orders) {
      const recipe = await Recipe.findOne({
        kategoriya_id: o.kategoriya_id,
      }).select("kategoriya_nomi");
      o.kategoriya_nomi = recipe ? recipe.kategoriya_nomi : "Noma'lum";
    }

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("❌ Zakaslarni olishda xatolik:", error);
    res
      .status(500)
      .json({ message: "Server xatolik", error: error.message });
  }
};


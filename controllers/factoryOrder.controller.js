const axios = require("axios");
const WarehouseRoom = require("../models/WarehouseRoom");

const GLOBAL_API_URL = process.env.GLOBAL_API_URL;

/* =========================
   APPROVE FACTORY ORDER
========================= */
exports.approveFactoryOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1️⃣ Globaldan orderni olish
    const orderRes = await axios.get(
      `${GLOBAL_API_URL}/api/global/shop-orders`,
    );

    const order = orderRes.data.data.find((o) => o._id === orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order topilmadi",
      });
    }

    if (order.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Order allaqachon ko‘rilgan",
      });
    }

    // 2️⃣ Omborni topamiz
    const warehouse = await WarehouseRoom.findOne({ status: true });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Ombor topilmadi",
      });
    }

    // 3️⃣ Mahsulotni topamiz
    const product = warehouse.mahsulotlar.find(
      (p) => p.nom === order.product_name,
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Mahsulot omborda yo‘q",
      });
    }

    if (product.miqdor < order.qty) {
      return res.status(400).json({
        success: false,
        message: "Omborda yetarli mahsulot yo‘q",
      });
    }

    // 4️⃣ Minus qilamiz
    product.miqdor -= order.qty;
    product.oxirgi_ozgarish = new Date();

    // 5️⃣ Chiqim tarixiga yozamiz
    warehouse.chiqimlar.push({
      mahsulot: product.nom,
      miqdor: order.qty,
      izoh: `Filialga jo‘natildi (${order.shop_name})`,
    });

    await warehouse.save();

    // 6️⃣ Globalda statusni APPROVED qilamiz
    await axios.patch(
      `${GLOBAL_API_URL}/api/global/shop-orders/${orderId}/approve`,
    );

    res.json({
      success: true,
      message: "Order tasdiqlandi va ombordan chiqarildi",
    });
  } catch (error) {
    console.error("❌ approveFactoryOrder:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const axios = require("axios");
const WarehouseRoom = require("../models/WarehouseRoom");

const GLOBAL_API_URL = process.env.GLOBAL_API_URL;

/* =========================
   APPROVE FACTORY ORDER
========================= */
exports.approveFactoryOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1️⃣ Globaldan orderni olamiz
    const orderRes = await axios.get(
      `${GLOBAL_API_URL}/api/global/shop-orders/${orderId}`,
    );

    const order = orderRes.data?.data;

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

    if (!order.items || order.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Orderda mahsulot yo‘q",
      });
    }

    const warehouses = await WarehouseRoom.find({ status: true });

    /* ============================================
       2️⃣ HAR BIR ITEM UCHUN YETARLILIK TEKSHIRUV
    ============================================ */
    for (const item of order.items) {
      const soni = Number(item.soni);

      if (!soni || isNaN(soni)) {
        return res.status(400).json({
          success: false,
          message: `${item.product_name} soni noto‘g‘ri`,
        });
      }

      let totalAvailable = 0;

      warehouses.forEach((warehouse) => {
        warehouse.mahsulotlar.forEach((p) => {
          if (
            p.nom?.toLowerCase().trim() ===
            item.product_name?.toLowerCase().trim()
          ) {
            totalAvailable += Number(p.miqdor || 0);
          }
        });
      });

      if (totalAvailable < soni) {
        return res.status(400).json({
          success: false,
          message: `${item.product_name} omborda yetarli emas. Jami: ${totalAvailable}`,
        });
      }
    }

    /* ============================================
       3️⃣ ENDI REAL MINUS QILAMIZ
    ============================================ */
    for (const item of order.items) {
      let remaining = Number(item.soni);

      for (const warehouse of warehouses) {
        for (const p of warehouse.mahsulotlar) {
          if (
            p.nom?.toLowerCase().trim() ===
            item.product_name?.toLowerCase().trim()
          ) {
            if (remaining <= 0) break;

            const deduct = Math.min(Number(p.miqdor), remaining);

            p.miqdor -= deduct;
            p.oxirgi_ozgarish = new Date();

            warehouse.chiqimlar.push({
              mahsulot: p.nom,
              miqdor: deduct,
              izoh: `Filialga jo‘natildi (${order.shop_name})`,
              sana: new Date(),
            });

            remaining -= deduct;
          }
        }

        await warehouse.save();

        if (remaining <= 0) break;
      }
    }

    /* ============================================
       4️⃣ GLOBAL STATUSNI APPROVE QILAMIZ
    ============================================ */
    await axios.patch(
      `${GLOBAL_API_URL}/api/global/shop-orders/${orderId}/approve`,
    );

    res.json({
      success: true,
      message: "Order tasdiqlandi va ombordan chiqarildi ✅",
    });
  } catch (error) {
    console.error("approveFactoryOrder:", error);

    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

const FactoryOrder = require("../models/FactoryOrder");
const MainWarehouse = require("../models/MainWarehouse");
const WarehouseRoom = require("../models/WarehouseRoom");

exports.confirmFactoryOrderAuto = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ ZAKASNI OLAMIZ
    const order = await FactoryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ ok: false, message: "Zakas topilmadi" });
    }

    if (order.status !== "NEW") {
      return res.status(400).json({
        ok: false,
        message: "Zakas allaqachon tasdiqlangan",
      });
    }

    // 2️⃣ HAR BIR PRODUCT UCHUN
    for (const item of order.items) {
      let remaining = item.qty;

      /* =========================
         🔴 MAIN OMBORDAN AYIRISH
      ========================= */
      const mains = await MainWarehouse.find({
        kategoriya_nomi: item.product_name,
        miqdor: { $gt: 0 },
      });

      for (const m of mains) {
        if (remaining <= 0) break;

        const take = Math.min(m.miqdor, remaining);

        await MainWarehouse.updateOne(
          { _id: m._id },
          { $inc: { miqdor: -take } },
        );

        remaining -= take;
      }

      /* =========================
         🔵 ROOM OMBORDAN AYIRISH
      ========================= */
      if (remaining > 0) {
        const rooms = await WarehouseRoom.find({
          "mahsulotlar.nom": item.product_name,
        });

        for (const room of rooms) {
          for (const p of room.mahsulotlar) {
            if (remaining <= 0) break;
            if (p.nom !== item.product_name || p.miqdor <= 0) continue;

            const take = Math.min(p.miqdor, remaining);

            await WarehouseRoom.updateOne(
              {
                _id: room._id,
                "mahsulotlar.nom": item.product_name,
              },
              {
                $inc: { "mahsulotlar.$.miqdor": -take },
                $set: {
                  "mahsulotlar.$.oxirgi_ozgarish": new Date(),
                },
              },
            );

            remaining -= take;
          }
        }
      }

      // ❌ AGAR YETMAY QOLSA
      if (remaining > 0) {
        return res.status(400).json({
          ok: false,
          message: `${item.product_name} omborlarda yetarli emas`,
        });
      }
    }

    // 3️⃣ ZAKASNI TASDIQLAYMIZ
    order.status = "CONFIRMED";
    await order.save();

    res.json({
      ok: true,
      message: "Zakas tasdiqlandi va omborlardan avtomat minus qilindi ✅",
      order_id: order._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message });
  }
};

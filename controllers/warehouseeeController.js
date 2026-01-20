const MainWarehouse = require("../models/MainWarehouse");
const WarehouseRoom = require("../models/WarehouseRoom");

/* =========================
   🔹 2 TA OMBORNI BIRLASHTIRIB OLISH
========================= */
exports.getAllWarehouseProducts = async (req, res) => {
  const main = await MainWarehouse.find().lean();
  const rooms = await WarehouseRoom.find().lean();

  const mainMapped = main.map((m) => ({
    source: "MAIN",
    global_product_id: m.global_product_id,
    unit_id: m.unit_id,
    kategoriya_id: m.kategoriya_id,
    name: m.kategoriya_nomi,
    qty: m.miqdor,
    unit: m.birlik,
  }));

  const roomMapped = [];
  for (const room of rooms) {
    for (const p of room.mahsulotlar) {
      roomMapped.push({
        source: "ROOM",
        room_id: room._id,
        name: p.nom,
        qty: p.miqdor,
        unit: p.birlik,
      });
    }
  }

  res.json({
    ok: true,
    data: [...mainMapped, ...roomMapped],
  });
};

/* =========================
   🔻 BITTA MINUS ENDPOINT
========================= */
exports.bulkMinusWarehouseProducts = async (req, res) => {
  const { operations } = req.body;

  if (!Array.isArray(operations) || operations.length === 0) {
    return res.status(400).json({
      ok: false,
      message: "Operations bo‘sh yoki noto‘g‘ri",
    });
  }

  const results = [];

  for (const op of operations) {
    const { source, qty } = op;

    if (!qty || qty <= 0) {
      results.push({
        ok: false,
        message: "Miqdor noto‘g‘ri",
        operation: op,
      });
      continue;
    }

    /* =========================
       🔴 MAIN OMBOR
    ========================= */
    if (source === "MAIN") {
      const { global_product_id, unit_id, kategoriya_id } = op;

      const ok = await MainWarehouse.updateOne(
        {
          global_product_id,
          unit_id,
          kategoriya_id,
          miqdor: { $gte: qty },
        },
        { $inc: { miqdor: -qty } },
      );

      if (ok.modifiedCount === 0) {
        results.push({
          ok: false,
          message: "Main omborda yetarli emas",
          operation: op,
        });
        continue;
      }

      results.push({
        ok: true,
        message: "Main ombordan ayirildi",
        operation: op,
      });
      continue;
    }

    /* =========================
       🔵 ROOM OMBOR
    ========================= */
    if (source === "ROOM") {
      const { room_id, product_name } = op;

      const ok = await WarehouseRoom.updateOne(
        {
          _id: room_id,
          "mahsulotlar.nom": product_name,
          "mahsulotlar.miqdor": { $gte: qty },
        },
        {
          $inc: { "mahsulotlar.$.miqdor": -qty },
          $set: { "mahsulotlar.$.oxirgi_ozgarish": new Date() },
        },
      );

      if (ok.modifiedCount === 0) {
        results.push({
          ok: false,
          message: "Room omborda yetarli emas",
          operation: op,
        });
        continue;
      }

      results.push({
        ok: true,
        message: "Room ombordan ayirildi",
        operation: op,
      });
      continue;
    }

    results.push({
      ok: false,
      message: "Noto‘g‘ri source",
      operation: op,
    });
  }

  res.json({
    ok: true,
    total: results.length,
    results,
  });
};

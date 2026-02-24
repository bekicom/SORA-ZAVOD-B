// jobs/globalSync.job.js
const GlobalSyncQueue = require("../models/GlobalSyncQueue");
const syncGlobalProduct = require("../utils/syncGlobalProduct");

const SYNC_INTERVAL_MS = 6000_000; // 1 daqiqa
const BATCH_SIZE = 10;
const MAX_RETRY = 5;

async function processOne(item) {
  try {
    await syncGlobalProduct({
      name: item.name,
      birlik: item.birlik,
      category: item.category,
      qty: item.qty,
      price: item.price,
      product_type: item.product_type,
    });

    item.status = "done";
    item.error = null;
    await item.save();
    return true;
  } catch (err) {
    item.status = "error"; // ✅ endi error holat
    item.error = err?.message || "Unknown error";
    item.retry_count = (item.retry_count || 0) + 1;

    // ✅ retry limitdan oshsa: error holatda qoladi (manual ko‘rish mumkin)
    if (item.retry_count >= MAX_RETRY) {
      item.error = `MAX_RETRY(${MAX_RETRY}) reached: ${item.error}`;
    }

    await item.save();
    return false;
  }
}

module.exports.startGlobalSyncJob = () => {
  console.log("🔁 Global Sync Job ishga tushdi");

  setInterval(async () => {
    try {
      // ✅ pending + error (retry yetmagan) larni qayta ishlaymiz
      const list = await GlobalSyncQueue.find({
        status: { $in: ["pending", "error"] },
        $or: [
          { retry_count: { $lt: MAX_RETRY } },
          { retry_count: { $exists: false } },
        ],
      })
        .sort({ createdAt: 1 })
        .limit(BATCH_SIZE);

      for (const item of list) {
        // ✅ LOCK: birinchi bo‘lib "processing" qilib qo‘yamiz (oddiy lock)
        const locked = await GlobalSyncQueue.findOneAndUpdate(
          { _id: item._id, status: { $in: ["pending", "error"] } },
          { $set: { status: "pending" } }, // statusni o‘zgartirmaymiz, faqat lock uchun filter ishlatyapmiz
          { new: true },
        );

        if (!locked) continue; // boshqa process olib ketgan bo‘lishi mumkin

        await processOne(locked);
      }
    } catch (err) {
      console.error("❌ Global Sync Job error:", err?.message || err);
    }
  }, SYNC_INTERVAL_MS);
};

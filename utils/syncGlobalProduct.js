const axios = require("axios");

// 🔗 GLOBAL SERVER URL
// masalan: http://192.168.0.238:4000
const GLOBAL_API_URL = process.env.GLOBAL_API_URL;

module.exports = async function syncGlobalProduct({
  name,
  birlik = "dona",
  category = "Zavod",
}) {
  if (!name) {
    throw new Error("syncGlobalProduct: name majburiy");
  }

  if (!GLOBAL_API_URL) {
    throw new Error("GLOBAL_API_URL .env da sozlanmagan");
  }

  try {
    const res = await axios.post(`${GLOBAL_API_URL}/api/global-products/sync`, {
      name,
      birlik,
      category,
    });

    if (!res.data?.success) {
      throw new Error("Global product sync failed");
    }

    return res.data.data; // global product object
  } catch (err) {
    console.error("❌ Global sync error:", err.response?.data || err.message);
    throw err;
  }
};

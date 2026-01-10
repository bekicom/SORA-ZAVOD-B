const axios = require("axios");

// 🔹 Zavod server URL (local yoki VPN ichida bo‘ladi)
const FACTORY_API_URL = process.env.FACTORY_API_URL;

/* =====================================
   Zavoddan mahsulot nomlarini olish
===================================== */
exports.getFactoryProductNames = async (req, res) => {
  try {
    if (!FACTORY_API_URL) {
      return res.status(500).json({
        success: false,
        message: "FACTORY_API_URL .env da sozlanmagan",
      });
    }

    const response = await axios.get(
      `${FACTORY_API_URL}/api/public/warehouse/products/names`
    );


    const products = Array.isArray(response?.data?.data)
      ? response.data.data
      : [];

    res.json({
      success: true,
      source: "factory",
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("❌ getFactoryProductNames error:", {
      message: error.message,
      url: FACTORY_API_URL,
      code: error.code,
    });

    res.status(502).json({
      success: false,
      message: "Zavod server bilan bog‘lanib bo‘lmadi",
    });
  }
};

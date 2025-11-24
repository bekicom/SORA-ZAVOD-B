const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token yuborilmadi",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // 🔹 Foydalanuvchini bazadan tekshiramiz
    const user = await Admin.findById(decoded.id);
    if (!user || !user.status) {
      return res.status(401).json({
        success: false,
        message: "Foydalanuvchi topilmadi yoki faol emas",
      });
    }

    // 🔹 To'liq user ma'lumotini qo'shamiz
    req.user = {
      id: user._id,
      login: user.login,
      ism: user.ism,
      rol: user.rol,
      lavozim: user.lavozim,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({
      success: false,
      message: "Token yaroqsiz yoki muddati tugagan",
    });
  }
};

exports.authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Avval autentifikatsiya qiling",
      });
    }

    if (roles.length && !roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: "Sizda bu amalni bajarish uchun ruxsat yo'q",
      });
    }
    next();
  };
};

// 🔹 OMBORCHI uchun maxsus middleware
exports.omborchiOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Avval autentifikatsiya qiling",
    });
  }

  if (req.user.rol !== "omborchi") {
    return res.status(403).json({
      success: false,
      message: "Faqat omborchi uchun ruxsat etilgan",
    });
  }
  next();
};

// 🔹 ADMIN uchun maxsus middleware
exports.adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Avval autentifikatsiya qiling",
    });
  }

  if (req.user.rol !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Faqat admin uchun ruxsat etilgan",
    });
  }
  next();
};

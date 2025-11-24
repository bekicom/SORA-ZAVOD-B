// controllers/adminAuthController.js
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// 🔐 Token sozlamalari
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

// 🔹 30 KUNLIK TOKEN MUDDATLARI
const ACCESS_TOKEN_EXPIRES_IN = "30d";
const REFRESH_TOKEN_EXPIRES_IN = "30d";

// 🔹 Access token yaratish
function createAccessToken(admin) {
  return jwt.sign(
    {
      id: admin._id,
      login: admin.login,
      rol: admin.rol,
      ism: admin.ism,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

// 🔹 Refresh token yaratish
function createRefreshToken(admin) {
  return jwt.sign({ id: admin._id, type: "refresh" }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

/* ===============================================
   1️⃣ Admin YOKI OMBORCHI ro'yxatdan o'tadi
================================================ */
exports.register = async (req, res) => {
  try {
    const { login, parol, ism, rol, lavozim } = req.body;

    if (!login || !parol || !ism)
      return res.status(400).json({
        success: false,
        message: "Login, parol va ism kiritilishi shart",
      });

    // 🔹 Rolni tekshirish
    if (rol && !["admin", "omborchi"].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: "Rol faqat 'admin' yoki 'omborchi' bo'lishi mumkin",
      });
    }

    const existing = await Admin.findOne({ login });
    if (existing)
      return res.status(400).json({
        success: false,
        message: "Bu login bilan foydalanuvchi allaqachon mavjud",
      });

    const hash = await bcrypt.hash(parol, BCRYPT_SALT_ROUNDS);

    const admin = new Admin({
      login,
      parol_hash: hash,
      ism,
      rol: rol || "admin",
      lavozim: lavozim || "",
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: "Foydalanuvchi muvaffaqiyatli yaratildi ✅",
      user: {
        id: admin._id,
        login: admin.login,
        ism: admin.ism,
        rol: admin.rol,
        lavozim: admin.lavozim,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

/* ===============================================
   2️⃣ Login qilish (Admin & Omborchi)
================================================ */
exports.login = async (req, res) => {
  try {
    const { login, parol } = req.body;
    if (!login || !parol)
      return res.status(400).json({
        success: false,
        message: "Login va parol kerak",
      });

    const admin = await Admin.findOne({ login, status: true });
    if (!admin)
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi yoki faol emas",
      });

    const isMatch = await bcrypt.compare(parol, admin.parol_hash);
    if (!isMatch)
      return res.status(401).json({
        success: false,
        message: "Login yoki parol noto'g'ri",
      });

    const accessToken = createAccessToken(admin);
    const refreshToken = createRefreshToken(admin);

    admin.refreshToken = refreshToken;
    await admin.save();

    res.json({
      success: true,
      message: "Tizimga muvaffaqiyatli kirildi ✅",
      accessToken,
      refreshToken,
      user: {
        id: admin._id,
        login: admin.login,
        ism: admin.ism,
        rol: admin.rol,
        lavozim: admin.lavozim,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

/* ===============================================
   3️⃣ Token yangilash
================================================ */
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({
        success: false,
        message: "refreshToken kerak",
      });

    const payload = jwt.verify(refreshToken, JWT_SECRET);
    const admin = await Admin.findById(payload.id);

    if (!admin || admin.refreshToken !== refreshToken)
      return res.status(401).json({
        success: false,
        message: "Token noto'g'ri",
      });

    const newAccess = createAccessToken(admin);
    const newRefresh = createRefreshToken(admin);

    admin.refreshToken = newRefresh;
    await admin.save();

    res.json({
      success: true,
      accessToken: newAccess,
      refreshToken: newRefresh,
      message: "Token yangilandi ✅",
    });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(401).json({
      success: false,
      message: "Token muddati tugagan yoki noto'g'ri",
    });
  }
};

/* ===============================================
   4️⃣ Logout
================================================ */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({
        success: false,
        message: "refreshToken kerak",
      });

    const payload = jwt.decode(refreshToken);
    if (!payload?.id)
      return res.status(400).json({
        success: false,
        message: "Token noto'g'ri formatda",
      });

    const admin = await Admin.findById(payload.id);
    if (admin) {
      admin.refreshToken = null;
      await admin.save();
    }

    res.json({
      success: true,
      message: "Chiqish muvaffaqiyatli bajarildi ✅",
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

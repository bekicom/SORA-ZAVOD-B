const Admin2 = require("../models/Admin2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// 🔐 Token sozlamalari
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

// 🔹 Token muddati
const ACCESS_TOKEN_EXPIRES_IN = "30d";
const REFRESH_TOKEN_EXPIRES_IN = "30d";

// ✅ Access token yaratish
function createAccessToken(admin2) {
  return jwt.sign(
    { id: admin2._id, username: admin2.username, role: "admin2" },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

// ✅ Refresh token yaratish
function createRefreshToken(admin2) {
  return jwt.sign({ id: admin2._id, type: "refresh" }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

/* ===============================================
   1️⃣ Admin2 ro‘yxatdan o‘tadi
================================================ */
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res
        .status(400)
        .json({ message: "Username va parol kiritish shart" });

    const existing = await Admin2.findOne({ username });
    if (existing)
      return res
        .status(400)
        .json({ message: "Bu foydalanuvchi allaqachon mavjud" });

    const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const admin2 = new Admin2({ username, password: hash });
    await admin2.save();

    res.status(201).json({
      message: "Admin2 muvaffaqiyatli yaratildi ✅",
      admin: {
        id: admin2._id,
        username: admin2.username,
        role: admin2.role,
      },
    });
  } catch (err) {
    console.error("Admin2 register error:", err);
    res.status(500).json({ message: "Server xatosi" });
  }
};

/* ===============================================
   2️⃣ Login qilish
================================================ */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "Username va parol kerak" });

    const admin2 = await Admin2.findOne({ username });
    if (!admin2)
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

    const isMatch = await bcrypt.compare(password, admin2.password);
    if (!isMatch)
      return res.status(401).json({ message: "Login yoki parol noto‘g‘ri" });

    const accessToken = createAccessToken(admin2);
    const refreshToken = createRefreshToken(admin2);

    admin2.refreshToken = refreshToken;
    await admin2.save();

    res.json({
      message: "Tizimga muvaffaqiyatli kirildi ✅",
      accessToken,
      refreshToken,
      admin: {
        id: admin2._id,
        username: admin2.username,
        role: admin2.role,
      },
    });
  } catch (err) {
    console.error("Admin2 login error:", err);
    res.status(500).json({ message: "Server xatosi" });
  }
};

/* ===============================================
   3️⃣ Token yangilash
================================================ */
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: "refreshToken kerak" });

    const payload = jwt.verify(refreshToken, JWT_SECRET);
    const admin2 = await Admin2.findById(payload.id);
    if (!admin2 || admin2.refreshToken !== refreshToken)
      return res.status(401).json({ message: "Token noto‘g‘ri" });

    const newAccess = createAccessToken(admin2);
    const newRefresh = createRefreshToken(admin2);

    admin2.refreshToken = newRefresh;
    await admin2.save();

    res.json({
      accessToken: newAccess,
      refreshToken: newRefresh,
      message: "Token yangilandi ✅",
    });
  } catch (err) {
    console.error("Admin2 refresh error:", err);
    res.status(401).json({ message: "Token muddati tugagan yoki noto‘g‘ri" });
  }
};

/* ===============================================
   4️⃣ Logout
================================================ */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: "refreshToken kerak" });

    const payload = jwt.decode(refreshToken);
    if (!payload?.id)
      return res.status(400).json({ message: "Token noto‘g‘ri formatda" });

    const admin2 = await Admin2.findById(payload.id);
    if (admin2) {
      admin2.refreshToken = null;
      await admin2.save();
    }

    res.json({ message: "Chiqish muvaffaqiyatli bajarildi ✅" });
  } catch (err) {
    console.error("Admin2 logout error:", err);
    res.status(500).json({ message: "Server xatosi" });
  }
};

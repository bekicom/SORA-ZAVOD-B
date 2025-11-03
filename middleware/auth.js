exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token yuborilmadi" });

    const decoded = require("jsonwebtoken").verify(
      token,
      process.env.JWT_SECRET
    );
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token yaroqsiz yoki muddati tugagan" });
  }
};

exports.authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res
        .status(403)
        .json({ message: "Sizda bu amalni bajarish uchun ruxsat yo‘q" });
    }
    next();
  };
};

// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const mainRoutes = require("./routes/mainRoutes");

const app = express();

/* ======================================================
   ⚙️ Middleware
====================================================== */
app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* ======================================================
   🛣️ Routes
====================================================== */
app.use("/api/", mainRoutes);

/* ======================================================
   🧾 Test route
====================================================== */
app.get("/", (req, res) => {
  res.json({
    status: true,
    message: "🧱 SORA-ZAVOD ADMIN SERVER ishlayapti 🚀",
    time: new Date().toLocaleString(),
  });
});

/* ======================================================
   ⚠️ Error handling
====================================================== */
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Sahifa topilmadi (404)" });
});

app.use((err, req, res, next) => {
  console.error("❌ Server xatosi:", err);
  res.status(500).json({ success: false, message: "Serverda ichki xatolik" });
});

/* ======================================================
   🚀 Server start
====================================================== */
const PORT = process.env.PORT || 8060;

// Avval MongoDB bilan ulanamiz, keyin serverni ishga tushiramiz
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server ${PORT}-portda ishga tushdi`);
    console.log(`🔗 http://localhost:${PORT}`);
  });
});

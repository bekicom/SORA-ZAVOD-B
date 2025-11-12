// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const app = express();

/* ⚙️ Middleware */
app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* 🚀 HTTP + SOCKET server */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

/* ===================================================
   🧠 SOCKET.IO ULANISH
=================================================== */
io.on("connection", (socket) => {
  console.log("🟢 Socket ulandi:", socket.id);

  // === Admin kanaliga ulanish ===
  socket.on("join_admin", () => {
    socket.join("admins");
    console.log(`👨‍💼 Admin kanaliga qo'shildi: ${socket.id}`);
  });

  // === Ombor kanaliga ulanish ===
  socket.on("join_warehouse", () => {
    socket.join("warehouse");
    console.log(`📦 Ombor kanaliga qo'shildi: ${socket.id}`);
  });

  // === Unit kanaliga ulanish ===
  socket.on("join_unit", (unit_code) => {
    socket.join(`unit_${unit_code}`);
    console.log(`🏭 Unit ${unit_code} kanaliga qo‘shildi`);
  });

  // === Uzilish holati ===
  socket.on("disconnect", () => {
    console.log("🔴 Socket uzildi:", socket.id);
  });
});

/* ===================================================
   🌐 ROUTES (Socket so‘ngida chaqiriladi)
=================================================== */
global.io = io; // bu orqali controllerlarda ishlatamiz
const mainRoutes = require("./routes/mainRoutes");
app.use("/api", mainRoutes);

/* ===================================================
   🧾 TEST ROUTE
=================================================== */
app.get("/", (req, res) => {
  res.json({
    status: true,
    message: "🧱 SORA-ZAVOD ADMIN SERVER ishlayapti 🚀",
    time: new Date().toLocaleString(),
  });
});

/* ===================================================
   ⚠️ XATOLAR BILAN ISHLASH
=================================================== */
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Sahifa topilmadi (404)" });
});

app.use((err, req, res, next) => {
  console.error("❌ Server xatosi:", err);
  res.status(500).json({ success: false, message: "Serverda ichki xatolik" });
});

/* ===================================================
   🚀 SERVERNI ISHGA TUSHURISH
=================================================== */
const PORT = process.env.PORT || 8060;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server ${PORT}-portda ishga tushdi`);
    console.log(`🔗 http://localhost:${PORT}`);
  });
});

/* ===================================================
   🌍 GLOBAL SOCKET EKSPORT
=================================================== */

module.exports = { io, server, app };

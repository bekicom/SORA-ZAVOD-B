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

/* ===================================================
   🚀 HTTP + SOCKET server
=================================================== */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

/* ===================================================
   🧠 SOCKET.IO ULANISH -
=================================================== */
io.on("connection", (socket) => {
  console.log("🟢 Socket ulandi:", socket.id);

  // === Admin kanaliga ulanish ===
  socket.on("join_admin", () => {
    socket.join("admins");
    console.log(`👨‍💼 Admin kanaliga qo'shildi: ${socket.id}`);
  });

  // === Omborchi kanaliga ulanish - YANGILANDI! ===
  socket.on("join_warehouse", (userData) => {
    socket.join("warehouse");
    console.log(`📦 Omborchi kanaliga qo'shildi: ${socket.id}`, userData || "");

    // 🔹 Omborchiga joriy zakaslar haqida ma'lumot yuborish
    socket.emit("warehouse_connected", {
      message: "Omborchi kanaliga muvaffaqiyatli ulandingiz",
      socket_id: socket.id,
      timestamp: new Date().toISOString(),
    });
  });

  // === Unit kanaliga ulanish ===
  socket.on("join_unit", (unit_code) => {
    socket.join(`unit_${unit_code}`);
    console.log(`🏭 Unit ${unit_code} kanaliga qo'shildi: ${socket.id}`);
  });

  // === Admin2 kanaliga ulanish (asosiy ombor admini) ===
  socket.on("join_admin2", () => {
    socket.join("admin2_channel");
    console.log(`🏢 Admin2 kanaliga qo'shildi: ${socket.id}`);
  });

  // === Zakas holatini yangilash - YANGI! ===
  socket.on("update_order_status", (data) => {
    console.log("🔄 Zakas holati yangilandi:", data);

    // 🔹 Barcha adminlarga yangilanish haqida bildirish
    io.to("admins").emit("order_status_changed", data);

    // 🔹 Agar zakas yakunlansa, unitga ham bildirish
    if (data.status === "completed") {
      io.to(`unit_${data.unit_code}`).emit("order_completed", data);
    }
  });

  // === Ombordan chiqim qilish - YANGI! ===
  socket.on("warehouse_chiqim", (data) => {
    console.log("📤 Ombordan chiqim:", data);

    // 🔹 Adminlarga chiqim haqida bildirish
    io.to("admins").emit("warehouse_chiqim_made", {
      ...data,
      timestamp: new Date().toISOString(),
      socket_id: socket.id,
    });
  });

  // === Uzilish holati ===
  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket uzildi:", socket.id, "Sabab:", reason);
  });

  // === Xatolik yuz berganda ===
  socket.on("error", (error) => {
    console.error("❌ Socket xatosi:", error);
  });
});

/* ===================================================
   🌐 ROUTES (Socket so'ngida chaqiriladi)
=================================================== */
global.io = io; // bu orqali controllerlarda ishlatamiz

// Asosiy route
const mainRoutes = require("./routes/mainRoutes");
app.use("/api", mainRoutes);

// 🆕 Admin2 uchun alohida route
const admin2Routes = require("./routes/admin2Routes");
app.use("/api/admin2", admin2Routes);
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

// 🔹 Socket test route - YANGI!
app.get("/socket-test", (req, res) => {
  res.json({
    success: true,
    message: "Socket test sahifasi",
    connected_clients: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
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
    console.log(`📡 Socket.io server faol`);
  });
});

/* ===================================================
   🌍 GLOBAL SOCKET EKSPORT
=================================================== */
module.exports = { io, server, app };

// jksxkjs

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

/* 🚀 SOCKET.IO Setup - ROUTELARDAN OLDIN! */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Socket ulandi:", socket.id);

  socket.on("join_admin", () => {
    socket.join("admins");
    console.log(`👨‍💼 Admin kanaliga qo'shildi: ${socket.id}`);
  });

  socket.on("join_warehouse", () => {
    socket.join("warehouse");
    console.log(`📦 Ombor kanaliga qo'shildi: ${socket.id}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket uzildi:", socket.id);
  });
});

// ✅ IO ni global qilish - ROUTELARDAN OLDIN
global.io = io;
// yoki
app.set("io", io);

/* 🛣️ Routes - IO sozlangandan KEYIN */
const mainRoutes = require("./routes/mainRoutes");
app.use("/api", mainRoutes);

/* 🧾 Test route */
app.get("/", (req, res) => {
  res.json({
    status: true,
    message: "🧱 SORA-ZAVOD ADMIN SERVER ishlayapti 🚀",
    time: new Date().toLocaleString(),
  });
});

/* ⚠️ Error handling */
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Sahifa topilmadi (404)" });
});

app.use((err, req, res, next) => {
  console.error("❌ Server xatosi:", err);
  res.status(500).json({ success: false, message: "Serverda ichki xatolik" });
});

/* 🚀 Server start */
const PORT = process.env.PORT || 8060;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server ${PORT}-portda ishga tushdi`);
    console.log(`🔗 http://localhost:${PORT}`);
  });
});

// Export ham qilamiz (agar kerak bo'lsa)
module.exports = { io, server, app };

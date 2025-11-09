const express = require("express");
const router = express.Router();

// === Controllerlar ===
const adminAuth = require("../controllers/adminAuthController");
const unitCtrl = require("../controllers/unitController");
const recipeCtrl = require("../controllers/recipeController");
const warehouseCtrl = require("../controllers/warehouseController");
const warehouseOrderCtrl = require("../controllers/warehouseOrderController");
const mainWarehouseCtrl = require("../controllers/mainWarehouseController");

// === Middlewarelar ===
const { authenticate, authorize } = require("../middleware/auth");

/* =======================================================
   🔐 AUTH (ADMIN)
======================================================= */
router.post("/auth/register", adminAuth.register);
router.post("/auth/login", adminAuth.login);
router.post("/auth/refresh", adminAuth.refresh);
router.post("/auth/logout", adminAuth.logout);

/* =======================================================
   🏭 UNITS (BO‘LIMLAR)
======================================================= */
router.post(
  "/units/create",
  authenticate,
  authorize(["admin"]),
  unitCtrl.createUnit
);

router.get("/units", authenticate, authorize(["admin"]), unitCtrl.getUnits);

router.get(
  "/units/:id",
  authenticate,
  authorize(["admin"]),
  unitCtrl.getUnitById
);

router.post(
  "/units/:id/add-category",
  authenticate,
  authorize(["admin"]),
  unitCtrl.addCategory
);

router.delete(
  "/units/:id",
  authenticate,
  authorize(["admin"]),
  unitCtrl.deleteUnit
);

/* 🔍 Kategoriya va unga biriktirilgan tex kartani olish */
if (unitCtrl.getCategoryWithRecipe) {
  router.get(
    "/units/:unit_id/category/:kategoriya_id",
    authenticate,
    authorize(["admin"]),
    unitCtrl.getCategoryWithRecipe
  );
}

/* 🔎 Unitni code orqali olish */
router.get("/units/code/:code", unitCtrl.getUnitByCode);

/* =======================================================
   🧊 UNIT OMBORI (ICHKI OMBOR)
======================================================= */

// 🔹 Bo‘limdagi kategoriyalarni olish
router.get(
  "/units/:id/categories",
  // authenticate,
  // authorize(["admin", "unit"]),
  unitCtrl.getUnitCategories
);

// 🔹 Bo‘lim ichki omboriga kirim qilish
router.post(
  "/units/:id/add-to-ombor",
  // authenticate,
  // authorize(["admin", "unit"]),
  unitCtrl.addToUnitOmbor
);

// 🔹 Bo‘lim ichki omboridagi mahsulotlarni ko‘rish
router.get(
  "/units/:id/unit-ombor",
  // authenticate,
  // authorize(["admin", "unit"]),
  unitCtrl.getUnitOmbor
);

/* =======================================================
   📋 RECIPE (TEX KARTALAR)
======================================================= */
// ➕ Yaratish (kategoriya_id orqali)
router.post(
  "/recipes/create",
  authenticate,
  authorize(["admin"]),
  recipeCtrl.createRecipe
);

// 📚 Barcha tex kartalarni olish
router.get(
  "/recipes",
  authenticate,
  authorize(["admin"]),
  recipeCtrl.getRecipes
);

// 🔍 Bitta tex kartani ID bo‘yicha olish
router.get(
  "/recipes/:id",
  authenticate,
  authorize(["admin"]),
  recipeCtrl.getRecipeById
);

// 🔎 Bo‘lim va kategoriya ID bo‘yicha mahsulotlarni olish
router.get(
  "/recipes/:unit_id/:kategoriya_id",
  authenticate,
  authorize(["admin"]),
  recipeCtrl.getRecipeByCategory
);

// ✏️ Yangilash
router.put(
  "/recipes/:id",
  authenticate,
  authorize(["admin"]),
  recipeCtrl.updateRecipe
);

// 🗑️ O‘chirish
router.delete(
  "/recipes/:id",
  authenticate,
  authorize(["admin"]),
  recipeCtrl.deleteRecipe
);

/* =======================================================
   🧺 OMBOR (WAREHOUSE)
======================================================= */
// 🏠 Xona yaratish
router.post(
  "/warehouse/create",
  authenticate,
  authorize(["admin"]),
  warehouseCtrl.createRoom
);

// 📦 Barcha xonalar (chiqim/kirimsiz)
router.get(
  "/warehouse",
  authenticate,
  authorize(["admin"]),
  warehouseCtrl.getRooms
);

// 🔍 Bitta xonani olish (chiqim/kirimsiz)
router.get(
  "/warehouse/:id",
  authenticate,
  authorize(["admin"]),
  warehouseCtrl.getRoomById
);

// 📥 Kirim
router.post(
  "/warehouse/:id/kirim",
  authenticate,
  authorize(["admin"]),
  warehouseCtrl.kirim
);

// 📤 Chiqim
router.post(
  "/warehouse/:id/chiqim",
  authenticate,
  authorize(["admin"]),
  warehouseCtrl.chiqim
);

// 📜 Tarixlar
router.get(
  "/warehouse/:id/kirimlar",
  authenticate,
  authorize(["admin"]),
  warehouseCtrl.getKirimlar
);

router.get(
  "/warehouse/:id/chiqimlar",
  authenticate,
  authorize(["admin"]),
  warehouseCtrl.getChiqimlar
);

/* =======================================================
   📦 OMBORGA ZAKAS (WAREHOUSE ORDERS)
======================================================= */
// ➕ Yangi zakas yaratish
router.post(
  "/warehouse-orders/create",
  warehouseOrderCtrl.createOrder // vaqtincha tokenni olib tashladik
);

// 📋 Barcha zakaslarni olish
router.get(
  "/warehouse-orders",
  authenticate,
  authorize(["admin"]),
  warehouseOrderCtrl.getOrders
);

// ✅ Zakasni tasdiqlash (admin)
router.put(
  "/warehouse-orders/:id/approve",
  authenticate,
  authorize(["admin"]),
  warehouseOrderCtrl.approveOrder
);
router.post(
  "/main-warehouse/kirim",
  authenticate,
  authorize(["admin"]),
  mainWarehouseCtrl.createKirim
);

router.get(
  "/main-warehouse",
  authenticate,
  authorize(["admin"]),
  mainWarehouseCtrl.getProducts
);

module.exports = router;

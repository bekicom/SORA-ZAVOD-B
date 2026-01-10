const express = require("express");
const router = express.Router();

// === Controllerlar ===
const adminAuth = require("../controllers/adminAuthController");
const unitCtrl = require("../controllers/unitController");
const recipeCtrl = require("../controllers/recipeController");
const warehouseCtrl = require("../controllers/warehouseController");
const warehouseOrderCtrl = require("../controllers/warehouseOrderController");
const mainWarehouseCtrl = require("../controllers/mainWarehouseController");
const unitInvoiceCtrl = require("../controllers/unitInvoiceController");
const unitLinkCtrl = require("../controllers/unitLinkController");
const unitRequestCtrl = require("../controllers/unitRequestController");
const employeeCtrl = require("../controllers/employee.controller");

// === Middlewarelar ===
const {
  authenticate,
  authorize,
  adminOnly,
  omborchiOnly,
} = require("../middleware/auth");
router.get(
  "/public/warehouse/products/names",
  warehouseCtrl.getAllProductNames
);

/* =======================================================
   🔐 AUTH (ADMIN & OMBORCHI)
======================================================= */
router.post("/auth/register", adminAuth.register);
router.post("/auth/login", adminAuth.login);
router.post("/auth/refresh", adminAuth.refresh);
router.post("/auth/logout", adminAuth.logout);

/* =======================================================
   🏭 UNITS (BO'LIMLAR) - FAQAT ADMIN
======================================================= */
router.post("/units/create", authenticate, adminOnly, unitCtrl.createUnit);
router.get("/units", unitCtrl.getUnits);
router.get("/units/:id", authenticate, adminOnly, unitCtrl.getUnitById);
router.post(
  "/units/:id/add-category",
  authenticate,
  adminOnly,
  unitCtrl.addCategory
);
router.delete("/units/:id", authenticate, adminOnly, unitCtrl.deleteUnit);
router.get("/units/code/:code", unitCtrl.getUnitByCode);

// 🔹 Unit kategoriyalari (hammaga ochiq)
router.get("/units/:id/categories", unitCtrl.getUnitCategories);
router.post("/units/:id/add-to-ombor", unitCtrl.addToUnitOmbor);
router.get("/units/:id/unit-ombor", unitCtrl.getUnitOmbor);

/* =======================================================
   📋 RECIPE (TEX KARTALAR) - FAQAT ADMIN
======================================================= */
router.post(
  "/recipes/create",
  authenticate,
  adminOnly,
  recipeCtrl.createRecipe
);
router.get("/recipes", authenticate, adminOnly, recipeCtrl.getRecipes);
router.get("/recipes/:id", authenticate, adminOnly, recipeCtrl.getRecipeById);
router.get(
  "/recipes/:unit_id/:kategoriya_id",
  authenticate,
  adminOnly,
  recipeCtrl.getRecipeByCategory
);
router.put(
  "/recipes/:id",
  authenticate,
  adminOnly,
  recipeCtrl.updateRecipeByCategory
);
router.delete("/recipes/:id", authenticate, adminOnly, recipeCtrl.deleteRecipe);

/* =======================================================
   🧺 OMBOR (WAREHOUSE) - FAQAT ADMIN
======================================================= */
router.post(
  "/warehouse/create",
  authenticate,
  adminOnly,
  warehouseCtrl.createRoom
);
router.get(
  "/warehouse",
  authenticate,
  authorize(["admin", "omborchi"]),
  warehouseCtrl.getRooms
);
router.get(
  "/warehouse/:id",
  authenticate,
  authorize(["admin", "omborchi"]),
  warehouseCtrl.getRoomById
);
router.post(
  "/warehouse/:id/kirim",
  authenticate,
  authorize(["admin", "omborchi"]),
  warehouseCtrl.kirim
);
router.post(
  "/warehouse/:id/chiqim",
  authenticate,
  authorize(["admin", "omborchi"]),
  warehouseCtrl.chiqim
);
router.get(
  "/warehouse/:id/kirimlar",
  authenticate,
  authorize(["admin", "omborchi"]),
  warehouseCtrl.getKirimlar
);
router.get(
  "/warehouse/:id/chiqimlar",
  authenticate,
  authorize(["admin", "omborchi"]),
  warehouseCtrl.getChiqimlar
);



/* =======================================================
   📦 OMBORGA ZAKAS (WAREHOUSE ORDERS)
======================================================= */
// ➕ Unit tomonidan zakas yaratish (tokensiz)
router.post("/warehouse-orders/create", warehouseOrderCtrl.createOrder);

// 📋 Admin: barcha zakaslarni ko'rish
router.get("/warehouse-orders", authenticate, warehouseOrderCtrl.getOrders);

// ✅ Admin: zakasni tasdiqlash
router.put(
  "/warehouse-orders/:id/approve",
  authenticate,
  warehouseOrderCtrl.approveOrder
);

/* =======================================================
   🏢 ASOSIY OMBOR (MAIN WAREHOUSE)
======================================================= */
router.get("/main-warehouse", mainWarehouseCtrl.getProducts);
router.get(
  "/main-warehouse/unit/:unit_id/history",
  mainWarehouseCtrl.getUnitKirimHistory
);
router.get("/main-warehouse/admin-view", mainWarehouseCtrl.getAdminView);

// 🔻 YANGI: Asosiy ombordan mahsulotni minus qilish
// POST /api/main-warehouse/minus
router.post(
  "/main-warehouse/minus",

  mainWarehouseCtrl.minusFromMainWarehouse
);

router.post("/unit-invoices/create", unitInvoiceCtrl.createInvoice);
router.get("/unit-invoices", unitInvoiceCtrl.getAllInvoices);
router.get("/unit-invoices/:id", unitInvoiceCtrl.getInvoiceById);
router.put("/unit-invoices/:id/approve", unitInvoiceCtrl.approveInvoice);
router.put("/unit-invoices/:id/reject", unitInvoiceCtrl.rejectInvoice);

/* =======================================================
   🔗 UNITLAR ORASIDA BOG'LANISHLAR
======================================================= */
router.post("/unit-links/create", unitLinkCtrl.createLink);
router.get("/unit-links", unitLinkCtrl.getLinks);
router.delete("/unit-links/:id", unitLinkCtrl.deleteLink);
router.get("/unit-links/linked/:unit_id", unitLinkCtrl.getLinkedUnits);

/* =======================================================
   📨 UNITLAR ORASIDA SO'ROV YUBORISH
======================================================= */
router.post("/unit-requests/create", unitRequestCtrl.createRequest);
router.put("/unit-requests/:id/approve", unitRequestCtrl.approveRequest);
router.put("/unit-requests/:id/receive", unitRequestCtrl.receiveRequest);
router.put("/unit-requests/:id/reject", unitRequestCtrl.rejectRequest);
router.get("/unit-requests/to/:unit_code", unitRequestCtrl.getRequestsForUnit);
router.get(
  "/units/:id/incoming-orders",
  authenticate, // unit xodimi token bilan kiradi
  authorize(["admin", "omborchi", "unit"]), // sizda unit role bo'lsa qo'shiladi
  unitCtrl.getIncomingOrdersForUnit
);

router.put(
  "/units/orders/:order_id/receive",
  unitCtrl.confirmOrderReceivedByUnit
);
/* =======================================================
   👨‍💼 OMBORCHI (SKLADCHI) ROUTE'LARI - YANGILANDI!
======================================================= */
// 📋 Tasdiqlangan zakaslarni ko'rish
router.get(
  "/skladchi/orders",
  authenticate,
  authorize(["admin", "omborchi"]),
  warehouseOrderCtrl.getApprovedOrdersForSkladchi
);

// 🖨️ Chop etish uchun zakas ma'lumotlari
router.get(
  "/skladchi/orders/:id/print",
  authenticate,
  omborchiOnly,
  warehouseOrderCtrl.getOrderForPrint
);

// ✅ OMBORCHI: Zakasni tasdiqlash (YANGI!)
router.put(
  "/skladchi/orders/:id/confirm",
  authenticate,
  omborchiOnly,
  warehouseOrderCtrl.confirmOrder
);

/* =======================================================
   🧪 TEST ROUTE'LARI
======================================================= */
// 🔐 Token test
router.get("/test-auth", authenticate, (req, res) => {
  res.json({
    success: true,
    message: "Token ishlayapti!",
    user: req.user,
  });
});

// 👨‍💼 Admin test
router.get("/test-admin", authenticate, adminOnly, (req, res) => {
  res.json({
    success: true,
    message: "Faqat admin kirishi mumkin!",
    user: req.user,
  });
});

// 📦 Omborchi test
router.get("/test-omborchi", authenticate, omborchiOnly, (req, res) => {
  res.json({
    success: true,
    message: "Faqat omborchi kirishi mumkin!",
    user: req.user,
  });
});

// ➕ Hodim qo'shish (Admin)
router.post(
  "/employees/create",
  authenticate,
  adminOnly,
  employeeCtrl.createEmployee
);

// 📋 Barcha hodimlar
router.get(
  "/employees",
  authenticate,
  authorize(["admin", "omborchi"]),
  employeeCtrl.getEmployees
);

// 📄 Bitta hodim
router.get(
  "/employees/:id",
  authenticate,
  authorize(["admin", "omborchi"]),
  employeeCtrl.getEmployeeById
);

// ✏️ Hodimni yangilash
router.put("/employees/:id", authenticate, employeeCtrl.updateEmployee);

// ❌ Hodimni o'chirish
router.delete("/employees/:id", authenticate, employeeCtrl.deleteEmployee);



module.exports = router;

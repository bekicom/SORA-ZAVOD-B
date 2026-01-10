const express = require("express");
const router = express.Router();
const admin2Auth = require("../controllers/admin2AuthController");
// const controller = require("../controllers/factoryProductController");


router.post("/register", admin2Auth.register);
router.post("/login", admin2Auth.login);
router.post("/refresh", admin2Auth.refresh);
router.post("/logout", admin2Auth.logout);



// router.get("/products/names", controller.getFactoryProductNames);

module.exports = router;

const express = require("express");
const {
    getUnits,
    getUnitById,
    addUnit,
    updateUnit,
    deleteUnit,
    sendOtp,
    verifyOtp
} = require("../controllers/unitController.js");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/all", verifyToken, verifyPermission("unit_module", "read"), getUnits);
router.get("/:id", verifyToken, verifyPermission("unit_module", "read"), getUnitById);
router.post("/add", verifyToken, verifyPermission("unit_module", "write"), addUnit);
router.put("/update/:id", verifyToken, verifyPermission("unit_module", "update"), updateUnit);
router.delete("/delete/:id", verifyToken, verifyPermission("unit_module", "delete"), deleteUnit);

router.post("/send-otp", verifyToken, sendOtp);
router.post("/verify-otp", verifyToken, verifyOtp);

module.exports = router;

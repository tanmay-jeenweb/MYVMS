const express = require("express");
const {
    getGuards,
    getGuardById,
    addGuard,
    updateGuard,
    deleteGuard,
    assignGate
} = require("../controllers/guardController.js");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");
const upload = require("../middleware/uploadMiddleware.js");

const router = express.Router();

router.get("/all", verifyToken, verifyPermission("guard_master", "read"), getGuards);
router.get("/:id", verifyToken, verifyPermission("guard_master", "read"), getGuardById);
router.post("/add", verifyToken, verifyPermission("guard_master", "write"), upload.single("doc"), addGuard);
router.put("/update/:id", verifyToken, verifyPermission("guard_master", "update"), upload.single("doc"), updateGuard);
router.put("/assign/:id", verifyToken, verifyPermission("guard_master", "update"), assignGate);
router.delete("/delete/:id", verifyToken, verifyPermission("guard_master", "delete"), deleteGuard);

module.exports = router;

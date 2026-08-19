const express = require("express");
const {
    getGates,
    getGateById,
    addGate,
    updateGate,
    deleteGate
} = require("../controllers/gateController.js");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/all", verifyToken, verifyPermission("gate_master", "read"), getGates);
router.get("/:id", verifyToken, verifyPermission("gate_master", "read"), getGateById);
router.post("/add", verifyToken, verifyPermission("gate_master", "write"), addGate);
router.put("/update/:id", verifyToken, verifyPermission("gate_master", "update"), updateGate);
router.delete("/delete/:id", verifyToken, verifyPermission("gate_master", "delete"), deleteGate);

module.exports = router;

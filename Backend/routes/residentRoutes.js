const express = require("express");
const {
    getResidents,
    getResidentById,
    addResident,
    updateResident,
    deleteResident
} = require("../controllers/residentController.js");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");
const upload = require("../middleware/uploadMiddleware.js");

const router = express.Router();

router.get("/all", verifyToken, verifyPermission("resident_module", "read"), getResidents);
router.get("/:id", verifyToken, verifyPermission("resident_module", "read"), getResidentById);
router.post("/add", verifyToken, verifyPermission("resident_module", "write"), upload.any(), addResident);
router.put("/update/:id", verifyToken, verifyPermission("resident_module", "update"), upload.any(), updateResident);
router.delete("/delete/:id", verifyToken, verifyPermission("resident_module", "delete"), deleteResident);

module.exports = router;

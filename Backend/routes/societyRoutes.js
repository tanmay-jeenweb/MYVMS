const express = require("express");
const {
    getSocieties,
    getSocietyById,
    addSociety,
    updateSociety,
    deleteSociety
} = require("../controllers/societyController.js");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");
const upload = require("../middleware/uploadMiddleware.js");

const router = express.Router();

router.get("/all", verifyToken, verifyPermission("society_master", "read"), getSocieties);
router.get("/:id", verifyToken, verifyPermission("society_master", "read"), getSocietyById);
router.post("/add", verifyToken, verifyPermission("society_master", "write"), upload.single("image"), addSociety);
router.put("/update/:id", verifyToken, verifyPermission("society_master", "update"), upload.single("image"), updateSociety);
router.delete("/delete/:id", verifyToken, verifyPermission("society_master", "delete"), deleteSociety);

module.exports = router;

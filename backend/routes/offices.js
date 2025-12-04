const express = require("express");
const router = express.Router();
const OfficesController = require("../controllers/OfficesController");

// Routes
router.get("/", OfficesController.getAll);
router.get("/:id", OfficesController.getById);
router.post("/", OfficesController.create);
router.put("/:id", OfficesController.update);
router.delete("/:id", OfficesController.delete);

module.exports = router;

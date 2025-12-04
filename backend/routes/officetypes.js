const express = require('express');
const router = express.Router();
const db = require('../controllers/OfficesTypesController.js');
const OfficesController = require('../controllers/OfficesController');

// GET all  office types
router.get("/", OfficesTypesController.getAll);
router.get("/:id", OfficesTypesController.getById);
router.post("/", OfficeTypesController.create);
router.put("/:id", OfficeTypesController.update);
router.delete("/:id", OfficeTypesController.delete);

module.exports = router;
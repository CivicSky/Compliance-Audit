const express = require('express');
const router = express.Router();
const OfficeTypesController = require('../controllers/OfficesTypesController.js');

// GET all  office types
router.get("/", OfficeTypesController.getAll);
router.get("/:id", OfficeTypesController.getById);
router.post("/", OfficeTypesController.create);
router.put("/:id", OfficeTypesController.update);
router.delete("/:id", OfficeTypesController.delete);

module.exports = router;
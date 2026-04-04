const express = require("express");
const router = express.Router();
const OfficesController = require("../controllers/OfficesController");
const optionalAuth = require("../middleware/optionalAuth");

// Office Routes
router.get("/", OfficesController.getAll);
router.get("/:id/export", optionalAuth, OfficesController.exportOfficeExcel);
router.get("/:id", OfficesController.getById);
router.post("/", optionalAuth, OfficesController.create);
router.put("/:id", optionalAuth, OfficesController.update);
router.delete("/:id", optionalAuth, OfficesController.delete);

// Office Requirements Routes
router.get("/:id/requirements", OfficesController.getOfficeRequirements);
router.post("/:id/requirements", optionalAuth, OfficesController.addOfficeRequirements);
router.put("/:id/requirements/:requirementId/status", optionalAuth, OfficesController.updateRequirementStatus);
router.delete("/:id/requirements/:requirementId", optionalAuth, OfficesController.removeOfficeRequirement);

module.exports = router;

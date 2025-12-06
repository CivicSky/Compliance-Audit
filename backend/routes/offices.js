const express = require("express");
const router = express.Router();
const OfficesController = require("../controllers/OfficesController");

// Office Routes
router.get("/", OfficesController.getAll);
router.get("/:id", OfficesController.getById);
router.post("/", OfficesController.create);
router.put("/:id", OfficesController.update);
router.delete("/:id", OfficesController.delete);

// Office Requirements Routes
router.get("/:id/requirements", OfficesController.getOfficeRequirements);
router.post("/:id/requirements", OfficesController.addOfficeRequirements);
router.put("/:id/requirements/:requirementId/status", OfficesController.updateRequirementStatus);
router.delete("/:id/requirements/:requirementId", OfficesController.removeOfficeRequirement);

module.exports = router;

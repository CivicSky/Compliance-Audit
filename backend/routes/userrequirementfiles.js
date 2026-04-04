const express = require('express');
const router = express.Router();
const UserRequirementFilesController = require('../controllers/UserRequirementFilesController');

// DELETE /api/requirements/:requirementId/file/:userId
router.delete('/api/requirements/:requirementId/file/:userId', UserRequirementFilesController.deleteUserRequirementFile);

module.exports = router;

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const OfficesController = require('../controllers/OfficesController');
const { saveOfficeProofDocument } = require('../utils/officeProof');

// Set up multer for document uploads
const documentsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: documentsStorage });

// ...existing office routes...
router.post('/:id/proof', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const officeId = req.params.id;
    await saveOfficeProofDocument(officeId, req.file.filename, req.file.originalname);
    res.json({ success: true, filename: req.file.filename, url: `/uploads/documents/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to upload document', error: err.message });
  }
});

module.exports = router;

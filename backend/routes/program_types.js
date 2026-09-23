const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/program_types
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name FROM program_types ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Failed to fetch program_types:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch program types' });
  }
});

module.exports = router;


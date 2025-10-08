const express = require('express');
const router = express.Router();

// Basic route for testing
router.get('/', (req, res) => {
  res.send('Offices route working');
});

module.exports = router;

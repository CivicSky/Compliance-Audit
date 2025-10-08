const express = require('express');
const router = express.Router();

// Basic route for testing
router.get('/', (req, res) => {
  res.send('Head of Office route working');
});

module.exports = router;

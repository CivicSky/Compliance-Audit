const express = require('express');
const router = express.Router();

// Basic route for testing
router.get('/', (req, res) => {
  res.send('Requirements route working');
});

module.exports = router;

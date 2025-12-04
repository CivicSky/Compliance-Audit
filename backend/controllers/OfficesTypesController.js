const db = require("../db"); // Your MySQL connection

const OfficeTypesController = {
  // Get all office types
  getAll: (req, res) => {
    const sql = "SELECT * FROM officetypes"; // Adjust table name as needed
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error fetching office types:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(results);
    });
  },

  // Get one office type by ID
  getById: (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM officetypes WHERE OfficeTypeID = ?";
    db.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Error fetching office type:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Office type not found" });
      }
      res.json(results[0]);
    });
  },

  // Create a new office type
  create: (req, res) => {
    const { TypeName } = req.body;
    if (!TypeName) {
      return res.status(400).json({ error: "TypeName is required" });
    }
    const sql = "INSERT INTO officetypes (TypeName) VALUES (?)";
    db.query(sql, [TypeName], (err, result) => {
      if (err) {
        console.error("Error creating office type:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(201).json({ 
        OfficeTypeID: result.insertId, 
        TypeName 
      });
    });
  },

  // Update an existing office type
  update: (req, res) => {
    const id = req.params.id;
    const { TypeName } = req.body;
    if (!TypeName) {
      return res.status(400).json({ error: "TypeName is required" });
    }
    const sql = "UPDATE officetypes SET TypeName = ? WHERE OfficeTypeID = ?";
    db.query(sql, [TypeName, id], (err, result) => {
      if (err) {
        console.error("Error updating office type:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Office type not found" });
      }
      res.json({ message: "Office type updated successfully" });
    });
  },

  // Delete an office type
  delete: (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM officetypes WHERE OfficeTypeID = ?";
    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error("Error deleting office type:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Office type not found" });
      }
      res.json({ message: "Office type deleted successfully" });
    });
  },
};

module.exports = OfficeTypesController;

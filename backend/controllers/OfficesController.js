const db = require("../db");

const OfficesController = {
  // ================================
  // GET ALL OFFICES (WITH JOINED DATA)
  // ================================
  getAll: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          o.OfficeID,
          o.OfficeName,
          o.OfficeTypeID,
          o.HeadID,
          o.status,
          o.progress,
          t.TypeName,
          h.FirstName,
          h.LastName
        FROM offices o
        LEFT JOIN officetypes t ON o.OfficeTypeID = t.OfficeTypeID
        LEFT JOIN officeheads h ON o.HeadID = h.HeadID
      `);

      const formatted = rows.map(r => ({
        OfficeID: r.OfficeID,
        OfficeName: r.OfficeName,
        OfficeTypeID: r.OfficeTypeID,
        TypeName: r.TypeName || "Unknown Type",
        HeadID: r.HeadID,
        HeadName: r.FirstName ? `${r.FirstName} ${r.LastName}` : "Unknown Head",
        status: r.status,
        progress: r.progress
      }));

      res.json(formatted);
    } catch (err) {
      console.error("Error fetching offices:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  // ================================
  // GET OFFICE BY ID
  // ================================
  getById: async (req, res) => {
    const id = req.params.id;

    try {
      const [rows] = await db.query(`
        SELECT 
          o.OfficeID,
          o.OfficeName,
          o.OfficeTypeID,
          o.HeadID,
          o.status,
          o.progress,
          t.TypeName,
          h.FirstName,
          h.LastName
        FROM offices o
        LEFT JOIN officetypes t ON o.OfficeTypeID = t.OfficeTypeID
        LEFT JOIN officeheads h ON o.HeadID = h.HeadID
        WHERE o.OfficeID = ?
      `, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Office not found" });
      }

      const r = rows[0];

      res.json({
        OfficeID: r.OfficeID,
        OfficeName: r.OfficeName,
        OfficeTypeID: r.OfficeTypeID,
        TypeName: r.TypeName || "Unknown Type",
        HeadID: r.HeadID,
        HeadName: r.FirstName ? `${r.FirstName} ${r.LastName}` : "Unknown Head",
        status: r.status,
        progress: r.progress
      });
    } catch (err) {
      console.error("Error fetching office:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  // ================================
  // CREATE NEW OFFICE
  // ================================
  create: async (req, res) => {
    const { OfficeName, OfficeTypeID, HeadID, status, progress } = req.body;

    try {
      const [result] = await db.query(
        `INSERT INTO offices (OfficeName, OfficeTypeID, HeadID, status, progress)
         VALUES (?, ?, ?, ?, ?)`,
        [
          OfficeName,
          OfficeTypeID,
          HeadID || null,
          status || "Active",
          progress || 0
        ]
      );

      res.json({
        OfficeID: result.insertId,
        OfficeName,
        OfficeTypeID,
        HeadID,
        status: status || "Active",
        progress: progress || 0
      });
    } catch (err) {
      console.error("Error creating office:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  // ================================
  // UPDATE OFFICE
  // ================================
  update: async (req, res) => {
    const id = req.params.id;
    const { OfficeName, OfficeTypeID, HeadID, status, progress } = req.body;

    try {
      const [result] = await db.query(
        `UPDATE offices 
         SET OfficeName = ?, OfficeTypeID = ?, HeadID = ?, status = ?, progress = ?
         WHERE OfficeID = ?`,
        [OfficeName, OfficeTypeID, HeadID, status, progress, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Office not found" });
      }

      res.json({ message: "Office updated successfully" });
    } catch (err) {
      console.error("Error updating office:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  // ================================
  // DELETE OFFICE
  // ================================
  delete: async (req, res) => {
    const id = req.params.id;

    try {
      const [result] = await db.query("DELETE FROM offices WHERE OfficeID = ?", [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Office not found" });
      }

      res.json({ message: "Office deleted successfully" });
    } catch (err) {
      console.error("Error deleting office:", err);
      res.status(500).json({ error: "Database error" });
    }
  }
};

module.exports = OfficesController;

const db = require('../db');

module.exports = {
  // GET all offices
  getAll: (req, res) => {
    db.query("SELECT * FROM offices", (err, rows) => {
      if (err) return res.status(500).json({ error: err });
      res.json(rows);
    });
  },

  // GET single office
  getById: (req, res) => {
    const id = req.params.id;

    db.query("SELECT * FROM offices WHERE id = ?", [id], (err, rows) => {
      if (err) return res.status(500).json({ error: err });
      if (rows.length === 0) return res.status(404).json({ message: "Not found" });

      res.json(rows[0]);
    });
  },

  // CREATE office
  create: (req, res) => {
    const { office_name, office_type, status, progress } = req.body;

    const sql = `
      INSERT INTO offices (office_name, office_type, status, progress)
      VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [office_name, office_type, status || "Active", progress || 0], (err, result) => {
      if (err) return res.status(500).json({ error: err });

      res.json({
        id: result.insertId,
        office_name,
        office_type,
        status,
        progress
      });
    });
  },

  // UPDATE office
  update: (req, res) => {
    const id = req.params.id;
    const { office_name, office_type, status, progress } = req.body;

    const sql = `
      UPDATE offices
      SET office_name = ?, office_type = ?, status = ?, progress = ?
      WHERE id = ?
    `;

    db.query(sql, [office_name, office_type, status, progress, id], (err) => {
      if (err) return res.status(500).json({ error: err });

      res.json({ message: "Office updated" });
    });
  },

  // DELETE office
  delete: (req, res) => {
    const id = req.params.id;

    db.query("DELETE FROM offices WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err });

      res.json({ message: "Office deleted" });
    });
  },
};

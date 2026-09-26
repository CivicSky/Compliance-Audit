const db = require('../db');
const { recordLog } = require('./logsController');

const eventDepartmentsController = {
  // GET all departments participating in an event with their levels and program stats
  getByEvent: async (req, res) => {
    try {
      const { eventId } = req.params;
      if (!eventId) {
        return res.status(400).json({ success: false, message: 'Event ID is required' });
      }

      let query;
      let params;

      if (String(eventId).toLowerCase() === 'all') {
        query = `
          SELECT 
            d.id AS department_id,
            d.name AS department_name,
            d.code AS department_code,
            NULL::integer AS id,
            NULL::integer AS event_id,
            NULL::timestamp AS created_at,
            NULL::timestamp AS updated_at,
            COUNT(DISTINCT o."OfficeID") AS program_count
          FROM departments d
          LEFT JOIN offices o ON o.master_list_id IN (SELECT id FROM master_list WHERE department_id = d.id)
          GROUP BY d.id, d.name, d.code
          ORDER BY d.id ASC
        `;
        params = [];
      } else {
        const numericEventId = Number(eventId);
        query = `
          SELECT 
            d.id AS department_id,
            d.name AS department_name,
            d.code AS department_code,
            ed.id AS id,
            COALESCE(ed.event_id, ?) AS event_id,
            ed.created_at,
            ed.updated_at,
            COUNT(DISTINCT o."OfficeID") AS program_count
          FROM departments d
          LEFT JOIN event_departments ed ON ed.department_id = d.id AND ed.event_id = ?
          LEFT JOIN offices o ON o."EventID" = ? AND o.master_list_id IN (SELECT id FROM master_list WHERE department_id = d.id)
          GROUP BY d.id, d.name, d.code, ed.id, ed.event_id, ed.created_at, ed.updated_at
          ORDER BY d.id ASC
        `;
        params = [numericEventId, numericEventId, numericEventId];
      }

      const [rows] = await db.query(query, params);
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('Error fetching event departments:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch event departments', details: err.message });
    }
  },

  // Assign a department to an event
  assignDepartment: async (req, res) => {
    try {
      const { event_id, department_id } = req.body;

      if (!event_id || !department_id) {
        return res.status(400).json({ success: false, message: 'Event ID and Department ID are required.' });
      }

      const [existing] = await db.query(
        `SELECT id FROM event_departments WHERE event_id = ? AND department_id = ? LIMIT 1`,
        [Number(event_id), Number(department_id)]
      );

      let record;
      if (existing.length > 0) {
        const [updated] = await db.query(
          `UPDATE event_departments 
           SET updated_at = CURRENT_TIMESTAMP 
           WHERE id = ? 
           RETURNING *`,
          [existing[0].id]
        );
        record = updated[0];
      } else {
        const [inserted] = await db.query(
          `INSERT INTO event_departments (event_id, department_id)
           VALUES (?, ?)
           RETURNING *`,
          [Number(event_id), Number(department_id)]
        );
        record = inserted[0];
      }

      // Link any existing offices in this event that belong to this department
      if (record?.id) {
        await db.query(
          `UPDATE offices 
           SET event_department_id = ? 
           WHERE "EventID" = ? 
             AND event_department_id IS NULL 
             AND master_list_id IN (SELECT id FROM master_list WHERE department_id = ?)`,
          [record.id, Number(event_id), Number(department_id)]
        );
      }

      // Fetch joined department name
      const [deptRows] = await db.query('SELECT name FROM departments WHERE id = ?', [Number(department_id)]);
      const departmentName = deptRows[0]?.name || `Department #${department_id}`;

      if (req.user?.userId) {
        try {
          await recordLog(req.user.userId, 'DepartmentAccredited', {
            eventId: event_id,
            department: departmentName,
            level: accreditation_level,
          });
        } catch (logErr) {
          console.error('Failed to record log:', logErr);
        }
      }

      res.json({
        success: true,
        message: 'Department assigned to accreditation event successfully',
        data: {
          ...record,
          department_name: departmentName,
        },
      });
    } catch (err) {
      console.error('Error assigning department to event:', err);
      res.status(500).json({ success: false, message: 'Failed to assign department', details: err.message });
    }
  },

  // Update accreditation level for academic programs under an event department
  updateLevel: async (req, res) => {
    try {
      const { id } = req.params;
      const { accreditation_level } = req.body;

      if (!accreditation_level) {
        return res.status(400).json({ success: false, message: 'Accreditation level is required.' });
      }

      // Update academic programs under this event department
      await db.query(
        `UPDATE offices SET accreditation_level = ? WHERE event_department_id = ?`,
        [accreditation_level, Number(id)]
      );

      res.json({
        success: true,
        message: 'Accreditation level updated for programs successfully',
        data: { id: Number(id), accreditation_level },
      });
    } catch (err) {
      console.error('Error updating accreditation level:', err);
      res.status(500).json({ success: false, message: 'Failed to update accreditation level', details: err.message });
    }
  },

  // Remove a department from an event
  deleteDepartment: async (req, res) => {
    try {
      const { id } = req.params;

      // Nullify office foreign keys first
      await db.query(`UPDATE offices SET event_department_id = NULL WHERE event_department_id = ?`, [Number(id)]);

      const [deleted] = await db.query(`DELETE FROM event_departments WHERE id = ? RETURNING *`, [Number(id)]);

      if (deleted.length === 0) {
        return res.status(404).json({ success: false, message: 'Event department not found.' });
      }

      res.json({
        success: true,
        message: 'Department removed from event successfully',
      });
    } catch (err) {
      console.error('Error removing department from event:', err);
      res.status(500).json({ success: false, message: 'Failed to remove department', details: err.message });
    }
  },
};

module.exports = eventDepartmentsController;

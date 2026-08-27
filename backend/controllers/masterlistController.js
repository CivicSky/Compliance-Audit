const db = require('../db');
const { recordLog } = require('./logsController');

const TABLE_NAME = 'master_list';
const ENTITY_TYPE_MAP = {
  1: 'Academic Program',
  2: 'Non-Academic Office',
};

const formatMasterListRow = (row) => ({
  id: row.id,
  name: row.entity_name,
  type: ENTITY_TYPE_MAP[row.entity_type_id] || row.entity_type || `Type ${row.entity_type_id}`,
  entityTypeId: row.entity_type_id,
  department: row.department_name || null,
  departmentId: row.department_id || null,
  status: 'Active',
  created_at: row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)) : null,
  updated_at: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)) : null,
});

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        m.id,
        m.entity_name,
        m.entity_type_id,
        m.department_id,
        m.created_at,
        m.updated_at,
        d.name AS department_name,
        CASE m.entity_type_id
          WHEN 1 THEN 'Academic Program'
          WHEN 2 THEN 'Non-Academic Office'
          ELSE 'Unknown'
        END AS entity_type
      FROM ${TABLE_NAME} m
      LEFT JOIN departments d ON m.department_id = d.id
      ORDER BY m.id ASC
      `
    );
    return res.json({ success: true, data: rows.map(formatMasterListRow) });
  } catch (error) {
    console.error('Error fetching master list items:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch master list items', error: error.message });
  }
};

exports.getAvailableForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const [rows] = await db.query(
      `
      SELECT
        m.id,
        m.entity_name,
        m.entity_type_id,
        m.department_id,
        m.created_at,
        m.updated_at,
        d.name AS department_name,
        CASE m.entity_type_id
          WHEN 1 THEN 'Academic Program'
          WHEN 2 THEN 'Non-Academic Office'
          ELSE 'Unknown'
        END AS entity_type
      FROM ${TABLE_NAME} m
      LEFT JOIN departments d ON m.department_id = d.id
      WHERE m.id NOT IN (
        SELECT master_list_id FROM offices WHERE EventID = ? AND master_list_id IS NOT NULL
      )
      ORDER BY m.entity_name ASC
      `,
      [eventId]
    );
    return res.json({ success: true, data: rows.map(formatMasterListRow) });
  } catch (error) {
    console.error('Error fetching available master list items:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch available items', error: error.message });
  }
};


exports.addItem = async (req, res) => {
  try {
    const { name, entityTypeId, type, departmentId, department } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    let parsedTypeId = Number(entityTypeId) || 0;

    if (!parsedTypeId && typeof type === 'string') {
      if (type === 'Academic Program') parsedTypeId = 1;
      else if (type === 'Non-Academic Office') parsedTypeId = 2;
    }

    if (!trimmedName || !parsedTypeId || !ENTITY_TYPE_MAP[parsedTypeId]) {
      return res.status(400).json({ success: false, message: 'Name and valid entity type are required.' });
    }

    let parsedDepartmentId = null;
    if (departmentId) {
      parsedDepartmentId = Number(departmentId) || null;
    } else if (department && typeof department === 'string') {
      const [rows] = await db.query('SELECT id FROM departments WHERE name = ? LIMIT 1', [department.trim()]);
      parsedDepartmentId = rows[0]?.id || null;
    }

    if (parsedTypeId === 1 && !parsedDepartmentId) {
      return res.status(400).json({ success: false, message: 'Department is required for an academic program.' });
    }

    const [result] = await db.query(
      `INSERT INTO ${TABLE_NAME} (entity_name, entity_type_id, department_id) VALUES (?, ?, ?)`,
      [trimmedName, parsedTypeId, parsedDepartmentId]
    );

    const [rows] = await db.query(
      `
      SELECT
        m.id,
        m.entity_name,
        m.entity_type_id,
        m.department_id,
        m.created_at,
        m.updated_at,
        d.name AS department_name,
        CASE m.entity_type_id
          WHEN 1 THEN 'Academic Program'
          WHEN 2 THEN 'Non-Academic Office'
          ELSE 'Unknown'
        END AS entity_type
      FROM ${TABLE_NAME} m
      LEFT JOIN departments d ON m.department_id = d.id
      WHERE m.id = ?
      `,
      [result.insertId]
    );

    const inserted = rows[0];
    if (!inserted) {
      return res.status(500).json({ success: false, message: 'Failed to retrieve added master list item.' });
    }

    const data = formatMasterListRow(inserted);
    if (req.user && req.user.userId) {
      try {
        recordLog(req.user.userId, 'MasterListItemAdded', { id: data.id, name: data.name });
      } catch (e) {
        console.error('Failed to record log for master list add:', e);
      }
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error adding master list item:', error);
    return res.status(500).json({ success: false, message: 'Failed to add master list item', error: error.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, entityTypeId, type, departmentId } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    let parsedTypeId = Number(entityTypeId) || 0;

    if (!parsedTypeId && typeof type === 'string') {
      if (type === 'Academic Program') parsedTypeId = 1;
      else if (type === 'Non-Academic Office') parsedTypeId = 2;
    }

    if (!trimmedName || !parsedTypeId || !ENTITY_TYPE_MAP[parsedTypeId]) {
      return res.status(400).json({ success: false, message: 'Name and valid entity type are required.' });
    }

    let parsedDepartmentId = departmentId ? Number(departmentId) || null : null;

    if (parsedTypeId === 1 && !parsedDepartmentId) {
      return res.status(400).json({ success: false, message: 'Department is required for an academic program.' });
    }

    await db.query(
      `UPDATE ${TABLE_NAME} SET entity_name = ?, entity_type_id = ?, department_id = ? WHERE id = ?`,
      [trimmedName, parsedTypeId, parsedDepartmentId, id]
    );

    const [rows] = await db.query(
      `
      SELECT
        m.id,
        m.entity_name,
        m.entity_type_id,
        m.department_id,
        m.created_at,
        m.updated_at,
        d.name AS department_name,
        CASE m.entity_type_id
          WHEN 1 THEN 'Academic Program'
          WHEN 2 THEN 'Non-Academic Office'
          ELSE 'Unknown'
        END AS entity_type
      FROM ${TABLE_NAME} m
      LEFT JOIN departments d ON m.department_id = d.id
      WHERE m.id = ?
      `,
      [id]
    );

    const updated = rows[0];
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Item not found after update.' });
    }

    const data = formatMasterListRow(updated);
    if (req.user && req.user.userId) {
      try {
        recordLog(req.user.userId, 'MasterListItemUpdated', { id: data.id, name: data.name });
      } catch (e) {
        console.error('Failed to record log for master list update:', e);
      }
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating master list item:', error);
    return res.status(500).json({ success: false, message: 'Failed to update master list item', error: error.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`SELECT entity_name FROM ${TABLE_NAME} WHERE id = ?`, [id]);
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    const itemName = rows[0].entity_name;
    await db.query(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
    if (req.user && req.user.userId) {
      try {
        recordLog(req.user.userId, 'MasterListItemDeleted', { id, name: itemName });
      } catch (e) {
        console.error('Failed to record log for master list delete:', e);
      }
    }
    return res.json({ success: true, message: `Item "${itemName}" deleted.` });
  } catch (error) {
    console.error('Error deleting master list item:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete master list item', error: error.message });
  }
};

exports.deleteMultiple = async (req, res) => {
  try {
    const rawIds = req.body?.ids || req.body?.itemIds || req.body?.masterListIds || req.body?.data?.ids || [];
    const ids = Array.isArray(rawIds) ? rawIds.map(Number).filter(n => Number.isInteger(n) && n > 0) : [];
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid IDs provided' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.query(`DELETE FROM master_list WHERE id IN (${placeholders})`, ids);
    if (req.user && req.user.userId) {
      try {
        recordLog(req.user.userId, 'MasterListItemsDeleted', { ids });
      } catch (e) {}
    }
    return res.json({ success: true, message: `Successfully deleted ${ids.length} item(s)` });
  } catch (error) {
    console.error('Error bulk deleting master list items:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete selected master list items', error: error.message });
  }
};


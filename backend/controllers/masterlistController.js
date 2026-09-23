const fs = require('fs');
const path = require('path');
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

/**
 * Cascading deletion of offices in ACC / audit events linked to deleted master list item(s).
 * Cleans up attached proof documents, user uploads, requirement statuses, head assignments,
 * and the office records themselves.
 */
async function deleteLinkedOffices(masterListIds = [], itemNames = []) {
  const ids = Array.isArray(masterListIds)
    ? masterListIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const names = Array.isArray(itemNames)
    ? itemNames.filter((n) => typeof n === 'string' && n.trim().length > 0)
    : [];

  if (ids.length === 0 && names.length === 0) return [];

  let query = 'SELECT OfficeID FROM offices WHERE ';
  const params = [];

  if (ids.length > 0 && names.length > 0) {
    const idPlaceholders = ids.map(() => '?').join(',');
    const namePlaceholders = names.map(() => '?').join(',');
    query += `master_list_id IN (${idPlaceholders}) OR (master_list_id IS NULL AND OfficeName IN (${namePlaceholders}))`;
    params.push(...ids, ...names);
  } else if (ids.length > 0) {
    const idPlaceholders = ids.map(() => '?').join(',');
    query += `master_list_id IN (${idPlaceholders})`;
    params.push(...ids);
  } else {
    const namePlaceholders = names.map(() => '?').join(',');
    query += `OfficeName IN (${namePlaceholders})`;
    params.push(...names);
  }

  const [officeRows] = await db.query(query, params);
  const officeIds = Array.isArray(officeRows)
    ? officeRows.map((r) => Number(r.OfficeID ?? r.officeid)).filter((n) => Number.isInteger(n) && n > 0)
    : [];

  if (officeIds.length === 0) return [];

  const placeholders = officeIds.map(() => '?').join(',');

  try {
    // 1) Find requirement IDs associated with these offices
    const [reqRows] = await db.query(
      `SELECT RequirementID FROM compliancestatusoffices WHERE OfficeID IN (${placeholders})`,
      officeIds
    );
    const requirementIds = Array.isArray(reqRows)
      ? reqRows.map((r) => Number(r.RequirementID ?? r.requirementid)).filter((n) => Number.isInteger(n) && n > 0)
      : [];

    if (requirementIds.length > 0) {
      const reqPlaceholders = requirementIds.map(() => '?').join(',');

      // Delete requirement proof documents from disk and DB
      try {
        const [proofFiles] = await db.query(
          `SELECT id, file_path FROM office_proof_documents WHERE requirement_id IN (${reqPlaceholders})`,
          requirementIds
        );
        if (proofFiles && proofFiles.length > 0) {
          for (const f of proofFiles) {
            try {
              const absPath = path.join(__dirname, '..', (f.file_path || '').replace(/^\//, ''));
              if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
            } catch (fsErr) {
              console.warn('Failed to delete proof file from disk:', fsErr);
            }
          }
          await db.query(`DELETE FROM office_proof_documents WHERE requirement_id IN (${reqPlaceholders})`, requirementIds);
        }
      } catch (e) {
        console.error('Error cleaning up proof documents during master list office delete:', e);
      }

      // Delete user requirement uploads from disk and DB
      try {
        const [userFiles] = await db.query(
          `SELECT id, file_path FROM requirement_user_uploads WHERE requirement_id IN (${reqPlaceholders})`,
          requirementIds
        );
        if (userFiles && userFiles.length > 0) {
          for (const uf of userFiles) {
            try {
              const absPath = path.join(__dirname, '..', (uf.file_path || '').replace(/^\//, ''));
              if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
            } catch (fsErr) {
              console.warn('Failed to delete user upload from disk:', fsErr);
            }
          }
          await db.query(`DELETE FROM requirement_user_uploads WHERE requirement_id IN (${reqPlaceholders})`, requirementIds);
        }
      } catch (e) {
        console.error('Error cleaning up user uploads during master list office delete:', e);
      }

      // Remove requirement user assignments
      try {
        await db.query(
          `DELETE FROM requirement_user_assignments WHERE OfficeID IN (${placeholders})`,
          officeIds
        );
      } catch (e) {
        console.error('Error cleaning up requirement_user_assignments during master list office delete:', e);
      }
    }

    // 2) Delete office-level proof documents from disk and DB
    try {
      const [officeProofs] = await db.query(
        `SELECT id, file_path FROM office_proof_documents WHERE office_id IN (${placeholders})`,
        officeIds
      );
      if (officeProofs && officeProofs.length > 0) {
        for (const f of officeProofs) {
          try {
            const absPath = path.join(__dirname, '..', (f.file_path || '').replace(/^\//, ''));
            if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
          } catch (fsErr) {}
        }
        await db.query(
          `DELETE FROM office_proof_documents WHERE office_id IN (${placeholders})`,
          officeIds
        );
      }
    } catch (e) {
      console.error('Error cleaning up office-level proofs during master list office delete:', e);
    }

    // 3) Delete compliance records, head assignments, and overall office status
    await db.query(`DELETE FROM compliancestatusoffices WHERE OfficeID IN (${placeholders})`, officeIds);
    await db.query(`DELETE FROM office_head_assignments WHERE OfficeID IN (${placeholders})`, officeIds);
    await db.query(`DELETE FROM OverallOfficeStatus WHERE OfficeID IN (${placeholders})`, officeIds);

    // 4) Delete the office records from offices table
    await db.query(`DELETE FROM offices WHERE OfficeID IN (${placeholders})`, officeIds);

    return officeIds;
  } catch (err) {
    console.error('Error cascading deletion of linked offices:', err);
    throw err;
  }
}

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

    // Keep linked offices names in sync if updated
    await db.query(
      `UPDATE offices SET OfficeName = ? WHERE master_list_id = ?`,
      [trimmedName, id]
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

    // Cascade delete any linked offices in ACC / audit events
    const deletedOfficeIds = await deleteLinkedOffices([Number(id)], [itemName]);

    // Delete item from master_list
    await db.query(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);

    if (req.user && req.user.userId) {
      try {
        recordLog(req.user.userId, 'MasterListItemDeleted', {
          id,
          name: itemName,
          deletedOfficesCount: deletedOfficeIds.length,
        });
      } catch (e) {
        console.error('Failed to record log for master list delete:', e);
      }
    }
    return res.json({
      success: true,
      message: `Item "${itemName}" and ${deletedOfficeIds.length} linked event office(s) deleted.`,
    });
  } catch (error) {
    console.error('Error deleting master list item:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete master list item', error: error.message });
  }
};

exports.deleteMultiple = async (req, res) => {
  try {
    const rawIds = req.body?.ids || req.body?.itemIds || req.body?.masterListIds || req.body?.data?.ids || [];
    const ids = Array.isArray(rawIds) ? rawIds.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid IDs provided' });
    }

    const placeholders = ids.map(() => '?').join(',');

    // Fetch entity names of items to be deleted
    const [itemRows] = await db.query(`SELECT id, entity_name FROM ${TABLE_NAME} WHERE id IN (${placeholders})`, ids);
    const itemNames = (itemRows || []).map((r) => r.entity_name).filter(Boolean);

    // Cascade delete any linked offices in ACC / audit events
    const deletedOfficeIds = await deleteLinkedOffices(ids, itemNames);

    // Delete items from master_list
    await db.query(`DELETE FROM ${TABLE_NAME} WHERE id IN (${placeholders})`, ids);

    if (req.user && req.user.userId) {
      try {
        recordLog(req.user.userId, 'MasterListItemsDeleted', {
          ids,
          deletedOfficesCount: deletedOfficeIds.length,
        });
      } catch (e) {}
    }
    return res.json({
      success: true,
      message: `Successfully deleted ${ids.length} item(s) and ${deletedOfficeIds.length} linked event office(s).`,
    });
  } catch (error) {
    console.error('Error bulk deleting master list items:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete selected master list items', error: error.message });
  }
};



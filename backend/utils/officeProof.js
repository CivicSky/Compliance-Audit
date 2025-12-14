const db = require('../db');

// Save proof document info to office_proof_document table
async function saveOfficeProofDocument(officeId, filename, originalName) {
  await db.query(
    `INSERT INTO office_proof_document (office_id, file_name, original_name, uploaded_at) VALUES (?, ?, ?, NOW())`,
    [officeId, filename, originalName]
  );
}

module.exports = { saveOfficeProofDocument };
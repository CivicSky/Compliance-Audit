const db = require('../db');

// Save proof document info to office_proof_document table
async function saveOfficeProofDocument(officeId, filename, originalName) {
  await db.query(
    `INSERT INTO office_proof_documents (office_id, file_name, file_path, uploaded_at) VALUES (?, ?, ?, NOW())`,
    [officeId, filename, filename]
  );
}

module.exports = { saveOfficeProofDocument };
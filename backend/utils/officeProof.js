const db = require('../db');

// Save proof document info to office_proof_document table (requirement_id IS NULL for proof documents, not requirement files)
async function saveOfficeProofDocument(officeId, filename, originalName, filePath = null) {
  // First, delete old proof documents for this office (where requirement_id IS NULL to only delete proof documents, not requirement files)
  await db.query(
    `DELETE FROM office_proof_documents WHERE office_id = ? AND requirement_id IS NULL`,
    [officeId]
  );
  
  // Ensure filePath is always provided - it should be the relative path from uploads/
  const finalFilePath = filePath || filename;
  
  console.log('Saving proof document to database - OfficeID:', officeId, 'File path:', finalFilePath);
  
  // Insert new proof document record (requirement_id is NULL for proof documents)
  await db.query(
    `INSERT INTO office_proof_documents (office_id, requirement_id, file_name, file_path, uploaded_at) VALUES (?, NULL, ?, ?, NOW())`,
    [officeId, filename, finalFilePath]
  );
  
  console.log('Proof document saved to database successfully');
}

module.exports = { saveOfficeProofDocument };
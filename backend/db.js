const postgres = require('postgres');
require('dotenv').config();

const rawUrl = (process.env.DATABASE_URL || '').trim();
const dbUrl = (rawUrl && rawUrl.startsWith('postgres'))
  ? rawUrl
  : 'postgresql://postgres.ylluxulqxkjircffndxg:gwapoakogwa@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

const sql = postgres(dbUrl, {
  ssl: {
    rejectUnauthorized: false
  },
  types: {
    date: {
      to: 1114,
      from: [1114],
      serialize: (x) => x,
      parse: (x) => (x ? new Date(x.replace(' ', 'T') + 'Z') : null)
    }
  }
});

// Helper function to scan SQL and quote capitalized identifiers that are not inside string literals
function quoteIdentifiers(sqlStr) {
  const identifiers = new Set([
    'UserID', 'RoleID', 'Email', 'PasswordHash', 'ProfilePic', 'FirstName', 'MiddleInitial', 'LastName',
    'RoleName', 'Description', 'EventID', 'EventCode', 'EventName', 'AreaID', 'AreaCode', 'AreaName',
    'SortOrder', 'IsActive', 'CreatedAt', 'UpdatedAt', 'CriteriaID', 'CriteriaCode', 'CriteriaName',
    'ParentCriteriaID', 'ParentRequirementCode', 'ParentRequirementID', 'RequirementID', 'RequirementCode',
    'OfficeID', 'OfficeName', 'OfficeTypeID', 'HeadID', 'Position', 'ContactInfo',
    'AssignmentID', 'AssignedAt', 'AssignedBy', 'CSOfficeID', 'DocumentProof', 'LastUpdated', 'Status',
    'CheckedBy', 'OverallStatusID', 'CompliedCount', 'PartiallyCompliedCount', 'NotCompliedCount',
    'TotalRequirements', 'CompliancePercent', 'OverallStatus', 'CommentID', 'Comment', 'LogID', 'Action',
    'Timestamp', 'Details', 'NotificationID', 'AdminID', 'Title', 'Message', 'Type', 'RelatedTable', 'RelatedID',
    'IsRead', 'ReadAt', 'HasUploaded', 'TypeName', 'StatusID', 'StatusName'
  ]);

  let result = '';
  let inQuote = null;
  let currentWord = '';

  for (let i = 0; i < sqlStr.length; i++) {
    const char = sqlStr[i];

    if (inQuote) {
      if (char === inQuote && sqlStr[i - 1] !== '\\') {
        inQuote = null;
      }
      result += char;
    } else {
      if (char === "'" || char === '"' || char === '`') {
        if (currentWord) {
          result += identifiers.has(currentWord) ? `"${currentWord}"` : currentWord;
          currentWord = '';
        }
        inQuote = char;
        result += char;
      } else if (/[a-zA-Z0-9_]/.test(char)) {
        currentWord += char;
      } else {
        if (currentWord) {
          result += identifiers.has(currentWord) ? `"${currentWord}"` : currentWord;
          currentWord = '';
        }
        result += char;
      }
    }
  }

  if (currentWord) {
    result += identifiers.has(currentWord) ? `"${currentWord}"` : currentWord;
  }

  return result;
}

// Create a wrapper to match mysql2's API behavior so we don't break existing controller code:
const db = {
  query: async (text, params) => {
    let pgText = text;
    if (params && params.length > 0) {
      let index = 1;
      // Convert ? placeholders to $1, $2, etc.
      pgText = text.replace(/\?/g, () => `$${index++}`);
    }

    // Convert INSERT IGNORE INTO (MySQL) to PostgreSQL ON CONFLICT DO NOTHING
    if (/\bINSERT\s+IGNORE\s+INTO\b/i.test(pgText)) {
      pgText = pgText.replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, 'INSERT INTO');
      if (!/\bon\s+conflict\b/i.test(pgText)) {
        pgText += ' ON CONFLICT DO NOTHING';
      }
    }

    // Convert backticks ` to double quotes " for PostgreSQL
    pgText = pgText.replace(/`/g, '"');

    // Automatically double-quote capitalized columns
    pgText = quoteIdentifiers(pgText);

    // If it is an INSERT statement, automatically append RETURNING * to get the auto-increment ID
    if (/^\s*insert\s+into\s+/i.test(pgText) && !/\breturning\b/i.test(pgText)) {
      pgText += ' RETURNING *';
    }

    // Sanitize parameters so undefined becomes null (preventing Postgres 'undefined' string casting)
    const cleanParams = (params || []).map(p => (p === undefined ? null : p));

    // Run the query using the postgres library's unsafe method for raw SQL string execution
    const result = await sql.unsafe(pgText, cleanParams);
    
    // Add compatibility properties
    result.affectedRows = result.count;
    if (result.length > 0) {
      const row = result[0];
      if (/insert\s+into\s+["`]?areas["`]?/i.test(pgText)) {
        result.insertId = row.AreaID ?? row.areaid ?? row.id ?? row.ID;
      } else if (/insert\s+into\s+["`]?criteria["`]?/i.test(pgText)) {
        result.insertId = row.CriteriaID ?? row.criteriaid ?? row.id ?? row.ID;
      } else if (/insert\s+into\s+["`]?requirements["`]?/i.test(pgText)) {
        result.insertId = row.RequirementID ?? row.requirementid ?? row.id ?? row.ID;
      } else if (/insert\s+into\s+["`]?events["`]?/i.test(pgText)) {
        result.insertId = row.EventID ?? row.eventid ?? row.id ?? row.ID;
      } else {
        result.insertId = row.id ?? row.ID ?? row.AreaID ?? row.areaid ?? row.CriteriaID ?? row.criteriaid ?? row.RequirementID ?? row.requirementid ?? row.EventID ?? row.eventid ?? row.UserID ?? row.userid ?? Object.values(row)[0];
      }
    }

    return [result, result];
  },
  execute: async (text, params) => {
    return db.query(text, params);
  }
};

// Simple test query to verify connection
db.query('SELECT 1 AS connect_test')
  .then(() => console.log('Successfully connected to Supabase PostgreSQL using postgres library!'))
  .catch(err => console.error('Database connection error:', err));

module.exports = db;

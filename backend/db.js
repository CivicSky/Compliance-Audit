const postgres = require('postgres');
require('dotenv').config();

const rawUrl = (process.env.DATABASE_URL || '').trim();
const dbUrl = (rawUrl && rawUrl.startsWith('postgres'))
  ? rawUrl
  : 'postgresql://postgres.ylluxulqxkjircffndxg:gwapoakogwa@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

const sql = postgres(dbUrl, {
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
  onnotice: () => {},
  types: {
    date: {
      to: 1114,
      from: [1114],
      serialize: (x) => x,
      parse: (x) => (x ? new Date(x.replace(' ', 'T') + 'Z') : null)
    }
  }
});

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

    // Strip backticks or quotes around identifiers
    // Strip MySQL backtick identifiers only; preserve PostgreSQL double-quoted identifiers for alias casing
    pgText = pgText.replace(/`/g, '');

    // If it is an INSERT statement, automatically append RETURNING * to get auto-increment ID
    if (/^\s*insert\s+into\s+/i.test(pgText) && !/\breturning\b/i.test(pgText)) {
      pgText += ' RETURNING *';
    }

    const cleanParams = (params || []).map(p => (p === undefined ? null : p));

    // Pure direct execution without any runtime maps or conversions
    const result = await sql.unsafe(pgText, cleanParams);

    result.affectedRows = result.count;
    if (result.length > 0) {
      const row = result[0];
      result.insertId = row.id ?? row.areaid ?? row.criteriaid ?? row.requirementid ?? row.eventid ?? row.userid ?? row.officeid ?? Object.values(row)[0];
    }

    return [result, result];
  },
  execute: async (text, params) => {
    return db.query(text, params);
  }
};

// Test connection
db.query('SELECT 1 AS connect_test')
  .then(() => console.log('Successfully connected to Supabase PostgreSQL using postgres library!'))
  .catch(err => console.error('Database connection error:', err));

module.exports = db;

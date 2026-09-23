const db = require('../db');

async function runMigration() {
  console.log('Starting migration for event_departments...');

  // 1. Create event_departments table
  await db.query(`
    CREATE TABLE IF NOT EXISTS event_departments (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events("EventID") ON DELETE CASCADE,
      department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      accreditation_level VARCHAR(50) NOT NULL DEFAULT 'Level I',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_event_department UNIQUE (event_id, department_id)
    );
  `);
  console.log('Created/verified event_departments table');

  // 2. Add event_department_id column to offices table if not exists
  await db.query(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offices' AND column_name = 'event_department_id'
      ) THEN 
        ALTER TABLE offices ADD COLUMN event_department_id INTEGER REFERENCES event_departments(id) ON DELETE SET NULL;
      END IF; 
    END $$;
  `);
  console.log('Created/verified event_department_id column on offices');

  // 3. Backfill existing academic offices into event_departments
  const [academicOffices] = await db.query(`
    SELECT o."OfficeID", o."EventID", m.department_id
    FROM offices o
    JOIN master_list m ON o.master_list_id = m.id
    WHERE m.entity_type_id = 1 
      AND m.department_id IS NOT NULL 
      AND o."EventID" IS NOT NULL
      AND o."EventID" IN (SELECT "EventID" FROM events)
      AND o.event_department_id IS NULL;
  `);

  console.log(`Found ${academicOffices.length} academic office records to link to event_departments.`);

  for (const row of academicOffices) {
    const { OfficeID, EventID, department_id } = row;
    if (!EventID || !department_id) continue;

    // Check if event_department entry exists
    const [existing] = await db.query(
      `SELECT id FROM event_departments WHERE event_id = ? AND department_id = ? LIMIT 1`,
      [EventID, department_id]
    );

    let eventDeptId = existing[0]?.id;

    if (!eventDeptId) {
      const [inserted] = await db.query(
        `INSERT INTO event_departments (event_id, department_id, accreditation_level)
         VALUES (?, ?, 'Level I')
         ON CONFLICT (event_id, department_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [EventID, department_id]
      );
      eventDeptId = inserted[0]?.id || inserted.insertId;
    }

    if (eventDeptId) {
      await db.query(
        `UPDATE offices SET event_department_id = ? WHERE "OfficeID" = ?`,
        [eventDeptId, OfficeID]
      );
    }
  }

  console.log('Successfully backfilled academic offices into event_departments!');

  // Verify created records
  const [createdEventDepts] = await db.query(`
    SELECT ed.id, ed.event_id, ed.department_id, ed.accreditation_level, d.name AS dept_name, e."EventName"
    FROM event_departments ed
    JOIN departments d ON ed.department_id = d.id
    JOIN events e ON ed.event_id = e."EventID";
  `);
  console.log('Current event_departments records:', createdEventDepts);

  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

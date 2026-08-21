const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, 'utf8');
  envText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

const express = require('express');
const app = express();
const port = 5000;
const cors = require('cors');
const userRoutes = require('./routes/users');
const userListRoutes = require('./routes/userlist');
const officeHeadsRoutes = require('./routes/officeheads');
const eventsRoutes = require('./routes/events');
const requirementsRoutes = require('./routes/requirements');
const officesRoutes = require('./routes/offices');
const officetypes = require('./routes/officetypes');
const areasRoutes = require('./routes/areas');
const criteriaRoutes = require('./routes/criteria');
const notificationRoutes = require('./routes/notif');
const logsRoutes = require('./routes/logs');
const departmentsRoutes = require('./routes/departments');
const programTypesRoutes = require('./routes/program_types');
const masterlistRoutes = require('./routes/masterlist');

console.log('Backend started and logger active');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:8081', // Expo/React Native web dev server
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const jwt = require('jsonwebtoken');
app.use('/uploads', (req, res, next) => {
    if (req.path.startsWith('/profile-pics')) return next();

    const authHeader = req.headers.authorization || (req.query.token ? `Bearer ${req.query.token}` : null);
    if (authHeader) {
        try {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, "MY_SECRET_KEY");
            const roleId = Number(decoded.roleId);
            
            if (roleId === 4) {
                const isDownloadRequest = req.headers['sec-fetch-dest'] === 'download' || 
                                         req.query.download === '1' || 
                                         req.query.attachment === '1' ||
                                         (req.headers.accept && req.headers.accept.includes('application/octet-stream'));
                if (isDownloadRequest) {
                    return res.status(403).json({ success: false, message: "Forbidden: File downloading is restricted for Auditors." });
                }
            }
        } catch (e) {}
    }
    next();
}, express.static('uploads'));
app.use('/uploads/profile-pics', express.static('uploads/profile-pics'));
/*const rolesRoutes = require('./routes/roles');
const requirementsRoutes = require('./routes/requirements');
const officetypesRoutes = require('./routes/officetypes');
const officesRoutes = require('./routes/offices');
const logsRoutes = require('./routes/logs');
const headofofficeRoutes = require('./routes/headofoffice');
const complinancestatusofficesRoutes = require('./routes/compliancestatusoffices');
const complinancestatusRoutes = require('./routes/compliancestatus');*/
// Global request logger for debugging
app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);
  next();
});

// Audit logging middleware: record POST/PUT/PATCH/DELETE actions after response finishes
const { recordLog } = require('./controllers/logsController');
app.use((req, res, next) => {
  res.on('finish', () => {
    try {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const userId = req.user?.userId || null;
        const action = `${req.method} ${req.originalUrl}`;
        const details = JSON.stringify({ status: res.statusCode, body: req.body || null });
        if (userId) {
          recordLog(userId, action, details);
        }
      }
    } catch (err) {
      console.error('Audit log error:', err);
    }
  });
  next();
});

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'backend', time: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'backend', time: new Date().toISOString() });
}); 

app.use('/api/user', userRoutes);
app.use('/api/user', userListRoutes);
app.use('/api/officeheads', officeHeadsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/requirements', requirementsRoutes);
app.use('/api/offices', officesRoutes);
app.use('/api/officestypes', officetypes);
app.use('/api/areas', areasRoutes);
app.use('/api/criteria', criteriaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/program_types', programTypesRoutes);
app.use('/api/masterlist', masterlistRoutes);
// Ensure basic roles exist on startup (Admin, User, Personnel)
const db = require('./db');
async function ensureRoles() {
  try {
    const [rows] = await db.query('SELECT "RoleName" FROM roles WHERE "RoleName" IN (\'Admin\',\'User\',\'Personnel\')');
    const existing = rows.map(r => r.RoleName);
    if (!existing.includes('Personnel')) {
      await db.query('INSERT INTO roles ("RoleName", "Description") VALUES (?, ?)', ['Personnel', 'Personnel role']);
      console.log('Inserted missing role: Personnel');
    }
  } catch (err) {
    console.warn('Could not ensure roles (DB might not be initialized):', err.message || err);
  }
}
ensureRoles();
const complianceStatusOfficesRoutes = require('./routes/ComplianceStatusOffices');
const officeDocumentsRoutes = require('./routes/officedocuments');
app.use('/api/compliancestatusoffices', complianceStatusOfficesRoutes);
app.use('/api/officedocuments', officeDocumentsRoutes);

async function relaxLogUserLink() {
  try {
    const [rows] = await db.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'logs'::regclass AND conname = 'logs_ibfk_1'
    `);

    if (rows.length > 0) {
      await db.query('ALTER TABLE logs DROP CONSTRAINT logs_ibfk_1');
      console.log('Dropped logs foreign key: logs_ibfk_1');
    }
  } catch (err) {
    console.warn('Could not relax logs-user link:', err.message || err);
  }
}
relaxLogUserLink();
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

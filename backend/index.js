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
app.use('/uploads', express.static('uploads')); // Serve all uploaded files
app.use('/uploads/profile-pics', express.static('uploads/profile-pics')); // Explicitly serve profile-pics for user/office head
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
const complianceStatusOfficesRoutes = require('./routes/ComplianceStatusOffices');
const officeDocumentsRoutes = require('./routes/officedocuments');
app.use('/api/compliancestatusoffices', complianceStatusOfficesRoutes);
app.use('/api/officedocuments', officeDocumentsRoutes);
/*app.use('/roles', rolesRoutes);
app.use('/requirements', requirementsRoutes);
app.use('/officetypes', officetypesRoutes);
app.use('/offices', officesRoutes);
app.use('/logs', logsRoutes);
app.use('/headofoffice', headofofficeRoutes);
app.use('/compliancestatusoffices', complinancestatusofficesRoutes);
app.use('/compliancestatus', complinancestatusRoutes);*/

// Catch-all error handler (always return JSON)
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
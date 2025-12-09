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

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'], // Add common dev server ports
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
/*app.use('/roles', rolesRoutes);
app.use('/requirements', requirementsRoutes);
app.use('/officetypes', officetypesRoutes);
app.use('/offices', officesRoutes);
app.use('/logs', logsRoutes);
app.use('/headofoffice', headofofficeRoutes);
app.use('/compliancestatusoffices', complinancestatusofficesRoutes);
app.use('/compliancestatus', complinancestatusRoutes);*/

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
const express = require('express');
const app = express();
const port = 5000;
const cors = require('cors');
const userRoutes = require('./routes/users');
const officeHeadsRoutes = require('./routes/officeheads');

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'], // Add common dev server ports
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files
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

app.use('/user', userRoutes);
app.use('/api/officeheads', officeHeadsRoutes);
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
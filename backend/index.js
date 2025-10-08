const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');

app.use(cors());
app.use(express.json());

const usersRoutes = require('./routes/users');
const rolesRoutes = require('./routes/roles');
const requirementsRoutes = require('./routes/requirements');
const officetypesRoutes = require('./routes/officetypes');
const officesRoutes = require('./routes/offices');
const logsRoutes = require('./routes/logs');
const headofofficeRoutes = require('./routes/headofoffice');
const complinancestatusofficesRoutes = require('./routes/compliancestatusoffices');
const complinancestatusRoutes = require('./routes/compliancestatus');

app.get('/', (req, res) => {
  res.send('Hello, Express!');
  res.json({ ok: true, service: 'backend', time: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'backend', time: new Date().toISOString() });
});


app.use('/users', usersRoutes);
app.use('/roles', rolesRoutes);
app.use('/requirements', requirementsRoutes);
app.use('/officetypes', officetypesRoutes);
app.use('/offices', officesRoutes);
app.use('/logs', logsRoutes);
app.use('/headofoffice', headofofficeRoutes);
app.use('/compliancestatusoffices', complinancestatusofficesRoutes);
app.use('/compliancestatus', complinancestatusRoutes);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
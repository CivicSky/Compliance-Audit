const db = require('../db');

// Fetch all compliance status offices
exports.getAllComplianceStatusOffices = async (req, res) => {
	try {
		const [results] = await db.query('SELECT * FROM compliancestatusoffices');
		res.json(results);
	} catch (err) {
		console.error('Error fetching compliance status offices:', err);
		res.status(500).json({ error: 'Database error' });
	}
};

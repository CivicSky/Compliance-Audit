const db = require('../db');

exports.getUsers = async (req, res) => {
  try {
    // Join users with roles to get role name
    const [rows] = await db.query(`
      SELECT u.UserID, u.FullName, u.Email, r.RoleName 
      FROM users u 
      LEFT JOIN roles r ON u.RoleID = r.RoleID
    `);

    // Format users into a clean text output
    const userList = rows.map(user => 
      `ID: ${user.UserID} | Name: ${user.FullName} | Email: ${user.Email} | Role: ${user.RoleName || 'N/A'}`
    ).join('\n');
    
    res.send(userList || 'No users found');
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error: Could not fetch users');
  }
};


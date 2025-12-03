const db = require('../db');

// Get all users controller
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT u.UserID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, u.RoleID, u.ProfilePic, r.RoleName FROM users u LEFT JOIN roles r ON u.RoleID = r.RoleID'
    );
    
    // Add combined FullName to each user
    const usersWithFullName = users.map(user => ({
      ...user,
      FullName: `${user.FirstName}${user.MiddleInitial ? ' ' + user.MiddleInitial + '.' : ''} ${user.LastName}`
    }));
    
    res.json({
      success: true,
      users: usersWithFullName
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching users'
    });
  }
};

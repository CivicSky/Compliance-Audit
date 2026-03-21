
const db = require('../db');

class NotificationController {
    // GET all notifications for a user
    static async getUserNotifications(req, res) {
        try {
            const { userId } = req.params;
            const { filter } = req.query; // 'all', 'read', 'unread'
            
            let whereClause = 'WHERE n.UserID = ?';
            const queryParams = [userId];
            
            if (filter === 'read') {
                whereClause += ' AND n.IsRead = 1';
            } else if (filter === 'unread') {
                whereClause += ' AND n.IsRead = 0';
            }
            
            const [notifications] = await db.query(`
                SELECT 
                    n.NotificationID,
                    n.Title,
                    n.Message,
                    n.Type,
                    n.RelatedTable,
                    n.RelatedID,
                    n.IsRead,
                    n.CreatedAt,
                    n.ReadAt,
                    u.FirstName as AdminFirstName,
                    u.LastName as AdminLastName
                FROM notifications n
                LEFT JOIN users u ON n.AdminID = u.UserID
                ${whereClause}
                ORDER BY n.CreatedAt DESC
            `, queryParams);
            
            res.json({
                success: true,
                data: notifications
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications',
                error: error.message
            });
        }
    }
    
    // POST create new notification (admin only)
    static async createNotification(req, res) {
        try {
            const { userIds, adminId, title, message, type = 'info', relatedTable, relatedId } = req.body;
            
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'User IDs are required'
                });
            }
            
            if (!adminId || !title || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Admin ID, title, and message are required'
                });
            }
            
            // Insert notifications for each user
            const insertPromises = userIds.map(userId => {
                return db.query(`
                    INSERT INTO notifications 
                    (UserID, AdminID, Title, Message, Type, RelatedTable, RelatedID, CreatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                `, [userId, adminId, title, message, type, relatedTable, relatedId]);
            });
            
            await Promise.all(insertPromises);
            
            res.json({
                success: true,
                message: `Notification sent to ${userIds.length} users`
            });
        } catch (error) {
            console.error('Error creating notification:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create notification',
                error: error.message
            });
        }
    }
    
    // PUT mark notification as read
    static async markAsRead(req, res) {
        try {
            const { notificationId } = req.params;
            
            await db.query(`
                UPDATE notifications 
                SET IsRead = 1, ReadAt = NOW() 
                WHERE NotificationID = ?
            `, [notificationId]);
            
            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read',
                error: error.message
            });
        }
    }
    
    // PUT mark all notifications as read for a user
    static async markAllAsRead(req, res) {
        try {
            const { userId } = req.params;
            
            await db.query(`
                UPDATE notifications 
                SET IsRead = 1, ReadAt = NOW() 
                WHERE UserID = ? AND IsRead = 0
            `, [userId]);
            
            res.json({
                success: true,
                message: 'All notifications marked as read'
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark all notifications as read',
                error: error.message
            });
        }
    }
    
    // GET notification counts
    static async getNotificationCounts(req, res) {
        try {
            const { userId } = req.params;
            
            const [counts] = await db.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN IsRead = 0 THEN 1 ELSE 0 END) as unread,
                    SUM(CASE WHEN IsRead = 1 THEN 1 ELSE 0 END) as \`read\`
                FROM notifications 
                WHERE UserID = ?
            `, [userId]);
            
            res.json({
                success: true,
                data: counts[0] || { total: 0, unread: 0, read: 0 }
            });
        } catch (error) {
            console.error('Error fetching notification counts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch notification counts',
                error: error.message
            });
        }
    }
    
    // DELETE notification
    static async deleteNotification(req, res) {
        try {
            const { notificationId } = req.params;
            
            await db.query(`
                DELETE FROM notifications 
                WHERE NotificationID = ?
            `, [notificationId]);
            
            res.json({
                success: true,
                message: 'Notification deleted'
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete notification',
                error: error.message
            });
        }
    }
}

module.exports = NotificationController;

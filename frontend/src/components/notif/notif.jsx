import React, { useEffect, useState } from "react";
import axios from "axios";

export default function NotificationPopup({ onClose }) {
    const [notifications, setNotifications] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'read', 'unread'
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [notificationCounts, setNotificationCounts] = useState({ total: 0, unread: 0, read: 0 });

    useEffect(() => {
        // Get current user from localStorage
        const token = localStorage.getItem('token');
        if (token) {
            const userData = localStorage.getItem('user');
            if (userData) {
                setCurrentUser(JSON.parse(userData));
            }
        }
    }, []);

    useEffect(() => {
        if (currentUser && currentUser.UserID) {
            fetchNotifications();
            fetchNotificationCounts();
        }
    }, [currentUser, filterStatus]);

    const fetchNotifications = async () => {
        if (!currentUser || !currentUser.UserID) return;
        
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5000/api/notifications/user/${currentUser.UserID}?filter=${filterStatus}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            if (response.data.success) {
                setNotifications(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchNotificationCounts = async () => {
        if (!currentUser || !currentUser.UserID) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5000/api/notifications/user/${currentUser.UserID}/counts`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            if (response.data.success) {
                setNotificationCounts(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching notification counts:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `http://localhost:5000/api/notifications/${notificationId}/read`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            // Update local state
            setNotifications(prev => 
                prev.map(notif => 
                    notif.NotificationID === notificationId 
                        ? { ...notif, IsRead: 1, ReadAt: new Date().toISOString() } 
                        : notif
                )
            );
            fetchNotificationCounts();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!currentUser || !currentUser.UserID) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `http://localhost:5000/api/notifications/user/${currentUser.UserID}/read-all`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            // Update local state
            setNotifications(prev => 
                prev.map(notif => ({ ...notif, IsRead: 1, ReadAt: new Date().toISOString() }))
            );
            fetchNotificationCounts();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const getNotificationStyle = (type, isRead) => {
        const baseStyle = "p-4 border-l-4 rounded-r-lg cursor-pointer hover:bg-gray-50 transition-colors";
        const readOpacity = isRead ? "opacity-70" : "";
        
        switch (type) {
            case 'info':
                return `${baseStyle} ${readOpacity} border-blue-400 bg-blue-50`;
            case 'success':
                return `${baseStyle} ${readOpacity} border-green-400 bg-green-50`;
            case 'warning':
                return `${baseStyle} ${readOpacity} border-orange-400 bg-orange-50`;
            case 'error':
                return `${baseStyle} ${readOpacity} border-red-400 bg-red-50`;
            case 'announcement':
                return `${baseStyle} ${readOpacity} border-purple-400 bg-purple-50`;
            default:
                return `${baseStyle} ${readOpacity} border-gray-400 bg-gray-50`;
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'info': return '💡';
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            case 'announcement': return '📢';
            default: return '📋';
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffInHours < 1) {
            const diffInMinutes = Math.floor((now - date) / (1000 * 60));
            return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        } else {
            const diffInDays = Math.floor(diffInHours / 24);
            return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
        }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header with filters */}
            <div className="p-6 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">
                        Notifications
                    </h3>
                    {notificationCounts.unread > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            Mark all read
                        </button>
                    )}
                </div>
                
                {/* Filter buttons */}
                <div className="flex gap-3">
                    {[
                        { value: 'all', label: 'All' },
                        { value: 'unread', label: 'Unread' },
                        { value: 'read', label: 'Read' }
                    ].map(filter => (
                        <button
                            key={filter.value}
                            onClick={() => setFilterStatus(filter.value)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                filterStatus === filter.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                        <svg className="w-16 h-16 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.586 17H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v5.586l-4 4H10.586z" />
                        </svg>
                        <p className="text-base">No notifications found</p>
                    </div>
                ) : (
                    <div className="p-6 space-y-4">
                        {notifications.map((notification) => (
                            <div
                                key={notification.NotificationID}
                                className={getNotificationStyle(notification.Type, notification.IsRead)}
                                onClick={() => !notification.IsRead && markAsRead(notification.NotificationID)}
                            >
                                <div className="flex items-start gap-4">
                                    <span className="text-2xl flex-shrink-0 mt-1">
                                        {getTypeIcon(notification.Type)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-semibold text-gray-900 text-base">
                                                {notification.Title}
                                            </h4>
                                            {!notification.IsRead && (
                                                <div className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0"></div>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                                            {notification.Message}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-500">
                                                {formatTimestamp(notification.CreatedAt)}
                                            </span>
                                            {notification.AdminFirstName && (
                                                <span className="text-sm text-gray-400">
                                                    by {notification.AdminFirstName} {notification.AdminLastName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}




import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { buildNotificationRedirect, getDisplayMessage } from '../../utils/notificationMeta';
import { API_BASE_URL } from '../../utils/apiBase';

export default function NotificationPopup({ onClose }) {
	const [notifications, setNotifications] = useState([]);
	const [filterStatus, setFilterStatus] = useState('all');
	const [loading, setLoading] = useState(false);
	const [currentUser, setCurrentUser] = useState(null);
	const [notificationCounts, setNotificationCounts] = useState({ total: 0, unread: 0, read: 0 });
	const navigate = useNavigate();

	useEffect(() => {
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
		if (!currentUser?.UserID) return;

		setLoading(true);
		try {
			const token = localStorage.getItem('token');
			const response = await axios.get(
				`${API_BASE_URL}/api/notifications/user/${currentUser.UserID}?filter=${filterStatus}`,
				{ headers: { Authorization: `Bearer ${token}` } }
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
		if (!currentUser?.UserID) return;

		try {
			const token = localStorage.getItem('token');
			const response = await axios.get(
				`${API_BASE_URL}/api/notifications/user/${currentUser.UserID}/counts`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			if (response.data.success) {
				setNotificationCounts(response.data.data);
				try {
					window.dispatchEvent(new CustomEvent('notificationsUpdated'));
				} catch {
					/* ignore */
				}
			}
		} catch (error) {
			console.error('Error fetching notification counts:', error);
		}
	};

	const markAsRead = async (notificationId) => {
		try {
			const token = localStorage.getItem('token');
			await axios.put(
				`${API_BASE_URL}/api/notifications/${notificationId}/read`,
				{},
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			setNotifications((prev) =>
				prev.map((notif) =>
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
		if (!currentUser?.UserID) return;

		try {
			const token = localStorage.getItem('token');
			await axios.put(
				`${API_BASE_URL}/api/notifications/user/${currentUser.UserID}/read-all`,
				{},
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			setNotifications((prev) =>
				prev.map((notif) => ({ ...notif, IsRead: 1, ReadAt: new Date().toISOString() }))
			);
			fetchNotificationCounts();
		} catch (error) {
			console.error('Error marking all notifications as read:', error);
		}
	};

	const getNotificationStyle = (type, isRead, hasLink) => {
		const baseStyle =
			'p-4 border-l-4 rounded-r-lg transition-colors' +
			(hasLink ? ' cursor-pointer hover:bg-stone-50/90' : '');
		const readOpacity = isRead ? 'opacity-75' : '';

		switch (type) {
			case 'info':
				return `${baseStyle} ${readOpacity} border-blue-400 bg-blue-50/80`;
			case 'success':
				return `${baseStyle} ${readOpacity} border-green-400 bg-green-50/80`;
			case 'warning':
				return `${baseStyle} ${readOpacity} border-orange-400 bg-orange-50/80`;
			case 'error':
				return `${baseStyle} ${readOpacity} border-red-400 bg-red-50/80`;
			case 'announcement':
				return `${baseStyle} ${readOpacity} border-purple-400 bg-purple-50/80`;
			default:
				return `${baseStyle} ${readOpacity} border-stone-400 bg-app-muted`;
		}
	};

	const getTypeIcon = (type) => {
		switch (type) {
			case 'info':
				return '💡';
			case 'success':
				return '✅';
			case 'warning':
				return '⚠️';
			case 'error':
				return '❌';
			case 'announcement':
				return '📢';
			default:
				return '📋';
		}
	};

	const formatTimestamp = (timestamp) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

		if (diffInHours < 1) {
			const diffInMinutes = Math.floor((now - date) / (1000 * 60));
			return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
		}
		if (diffInHours < 24) {
			return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
		}
		const diffInDays = Math.floor(diffInHours / 24);
		return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
	};

	const handleNotificationClick = async (notification) => {
		if (!notification) return;

		if (!notification.IsRead) {
			await markAsRead(notification.NotificationID);
		}

		const target = buildNotificationRedirect(notification);
		if (target?.path) {
			onClose?.();
			navigate(target.path);
		}
	};

	return (
		<div className="flex h-full min-h-0 max-h-[min(560px,calc(100vh-5.5rem))] flex-col bg-app-surface">
			<div className="shrink-0 border-b border-stone-200/90 bg-app-surface p-4">
				<div className="mb-3 flex items-center justify-between">
					<h3 className="text-lg font-semibold text-stone-900">Notifications</h3>
					{notificationCounts.unread > 0 && (
						<button
							type="button"
							onClick={markAllAsRead}
							className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
						>
							Mark all read
						</button>
					)}
				</div>

				<div className="flex gap-2">
					{[
						{ value: 'all', label: 'All' },
						{ value: 'unread', label: 'Unread' },
						{ value: 'read', label: 'Read' },
					].map((filter) => (
						<button
							key={filter.value}
							type="button"
							onClick={() => setFilterStatus(filter.value)}
							className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
								filterStatus === filter.value
									? 'bg-indigo-600 text-white'
									: 'bg-app-muted text-stone-600 hover:bg-stone-200/70'
							}`}
						>
							{filter.label}
						</button>
					))}
				</div>
			</div>

			<div className="notif-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
				{loading ? (
					<div className="flex h-32 items-center justify-center">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
					</div>
				) : notifications.length === 0 ? (
					<div className="flex h-32 flex-col items-center justify-center text-stone-500">
						<svg className="mb-3 h-14 w-14 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 17h5l-5 5v-5zM10.586 17H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v5.586l-4 4H10.586z"
							/>
						</svg>
						<p className="text-sm">No notifications found</p>
					</div>
				) : (
					<div className="space-y-3 p-4">
						{notifications.map((notification) => {
							const hasLink = Boolean(buildNotificationRedirect(notification)?.path);
							const displayMessage = getDisplayMessage(notification);

							return (
								<div
									key={notification.NotificationID}
									role={hasLink ? 'button' : undefined}
									tabIndex={hasLink ? 0 : undefined}
									className={getNotificationStyle(notification.Type, notification.IsRead, hasLink)}
									onClick={() => hasLink && handleNotificationClick(notification)}
									onKeyDown={(e) => {
										if (hasLink && (e.key === 'Enter' || e.key === ' ')) {
											e.preventDefault();
											handleNotificationClick(notification);
										}
									}}
								>
									<div className="flex items-start gap-3">
										<span className="mt-0.5 shrink-0 text-xl">{getTypeIcon(notification.Type)}</span>
										<div className="min-w-0 flex-1">
											<div className="mb-1 flex items-center gap-2">
												<h4 className="text-sm font-semibold text-stone-900">{notification.Title}</h4>
												{!notification.IsRead && (
													<div className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
												)}
											</div>
											<p className="mb-2 text-sm leading-relaxed text-stone-600">{displayMessage}</p>
											<div className="flex flex-wrap items-center justify-between gap-2">
												<span className="text-xs text-stone-500">
													{formatTimestamp(notification.CreatedAt)}
												</span>
												<div className="flex items-center gap-2">
													{notification.AdminFirstName && (
														<span className="text-xs text-stone-400">
															by {notification.AdminFirstName} {notification.AdminLastName}
														</span>
													)}
													{hasLink && (
														<span className="text-xs font-medium text-indigo-600">Open →</span>
													)}
												</div>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

import React, { useEffect, useState } from "react";
import Header from "../Header/header";
import { usersAPI } from "../../utils/api";
import EditProfileModal from "../EditProfile/editProfileModal";

export default function Profile() {
    const [user, setUser] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                setLoading(true);
                if (response.success) {
                    setUser(response.user);
                }
            } catch (error) {
                console.error("Error loading user:", error);
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    const getRoleName = (user) => {
        if (!user) return "";
        return user.RoleID === 1 ? "Admin" : "User";
    };

    const getRoleBadgeStyle = (roleId) => {
        switch(roleId) {
            case 1: return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 2: return 'bg-blue-50 text-blue-700 border-blue-200';
            case 3: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="px-6 pb-6 pt-6 w-full">
                <Header pageTitle="Profile" showSearch={false} />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading profile...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="px-6 pb-6 pt-6 w-full">
                <Header pageTitle="Profile" showSearch={false} />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <p className="text-gray-600 mb-2">Unable to load profile</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Profile photo logic
    let profilePicUrl = "/default-avatar.png";
    if (user.TempPreview) {
        profilePicUrl = user.TempPreview;
    } else if (user.ProfilePic) {
        profilePicUrl = `http://localhost:5000/uploads/profile-pics/${user.ProfilePic}`;
    }

    // Format date if available
    const formatDate = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header pageTitle="Profile" showSearch={false} />

            <div className="max-w-4xl mx-auto mt-6 px-8">
                {/* Profile Header with Edit Button */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Profile
                    </button>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-sm border-4 border-gray-100 overflow-hidden">
                    {/* Cover Photo */}
                    <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
                        {/* Profile Picture - Positioned to overlap cover and card */}
                        <div className="absolute -bottom-12 left-8">
                            <div className="relative">
                                <img
                                    src={profilePicUrl}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-xl border-4 border-white shadow-lg object-cover bg-white"
                                    onError={e => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                                />
                                {/* Online status indicator (optional) */}
                                <div className="absolute bottom-2 right-2 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Info Section */}
                    <div className="pt-14 px-8 pb-8">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {user.FirstName}
                                    {user.MiddleInitial ? ` ${user.MiddleInitial}.` : ""} {user.LastName}
                                </h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${getRoleBadgeStyle(user.RoleID)}`}>
                                        {getRoleName(user)}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Member since {formatDate(user.CreatedAt) || 'N/A'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Email with icon */}
                            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm">{user.Email}</span>
                            </div>
                        </div>

                        {/* User Details Grid */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Information */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                                    Personal Information
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Full Name</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {user.FirstName} {user.MiddleInitial ? user.MiddleInitial + '. ' : ''}{user.LastName}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Email Address</p>
                                            <p className="text-sm font-medium text-gray-900">{user.Email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Account Details */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                                    Account Details
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Role</p>
                                            <p className="text-sm font-medium text-gray-900">{getRoleName(user)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Member Since</p>
                                            <p className="text-sm font-medium text-gray-900">{formatDate(user.CreatedAt) || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Account Status</p>
                                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full">
                                                Active
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Info (if available) */}
                        {user.Bio && (
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Bio</h3>
                                <p className="text-sm text-gray-600">{user.Bio}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {modalOpen && (
                <EditProfileModal
                    user={user}
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onUpdate={(updatedUser) => setUser(updatedUser)}
                />
            )}
        </div>
    );
}
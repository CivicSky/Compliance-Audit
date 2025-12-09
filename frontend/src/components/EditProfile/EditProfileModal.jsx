import React, { useEffect, useState } from "react";
import { usersAPI } from "../../utils/api";

const EditProfileModal = ({ user, isOpen, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        firstName: "",
        middleInitial: "",
        lastName: "",
        email: "",
        profilePic: null
    });
    const [profilePicPreview, setProfilePicPreview] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.FirstName || "",
                middleInitial: user.MiddleInitial || "",
                lastName: user.LastName || "",
                email: user.Email || "",
                profilePic: null
            });
            // Always use the same logic as office head: if ProfilePic exists, use /uploads/profile-pics/filename
            setProfilePicPreview(user.ProfilePic ? `/uploads/profile-pics/${user.ProfilePic}` : "/default-avatar.png");
        }
    }, [user]);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFormData(prev => ({ ...prev, profilePic: file }));
        if (file) {
            setProfilePicPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formDataObj = new FormData();
            formDataObj.append('FirstName', formData.firstName);
            formDataObj.append('MiddleInitial', formData.middleInitial || '');
            formDataObj.append('LastName', formData.lastName);
            formDataObj.append('Email', formData.email);

            if (formData.profilePic instanceof File) {
                formDataObj.append('profilePic', formData.profilePic);
            }

            const response = await usersAPI.updateUser(user.UserID, formDataObj);
            if (response.success) {
                // If a new profile pic was uploaded, use the new path from backend
                if (response.user && response.user.ProfilePic) {
                    setProfilePicPreview(`/uploads/profile-pics/${response.user.ProfilePic}`);
                }
                onUpdate(response.user);
                // Emit a custom event to trigger navbar refresh
                window.dispatchEvent(new Event('profileUpdated'));
                onClose();
            } else {
                console.error("Update failed:", response.message);
            }
        } catch (error) {
            console.error("Update error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Edit Profile</h2>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* First Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Middle Initial */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Middle Initial</label>
                        <input
                            type="text"
                            name="middleInitial"
                            value={formData.middleInitial}
                            onChange={handleInputChange}
                            maxLength={1}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Profile Picture */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture</label>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 -mt-0.5">
                                <img
                                    src={profilePicPreview}
                                    alt="Preview"
                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
                                    onError={e => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                                />
                            </div>

                            <div className="flex-1">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    disabled={isSubmitting}
                                />
                                <p className="text-xs text-gray-500 mt-1">Upload an image file (JPG, PNG, etc.)</p>
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;

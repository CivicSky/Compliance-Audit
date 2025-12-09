import React, { useEffect, useState } from "react";
import Header from "../Header/header";
import { usersAPI } from "../../utils/api";
import EditProfileModal from "../EditProfile/editProfileModal";

export default function Profile() {
    const [user, setUser] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const response = await usersAPI.getLoggedInUser();
                if (response.success) {
                    setUser(response.user);
                }
            } catch (error) {
                console.error("Error loading user:", error);
            }
        };
        loadUser();
    }, []);

    const getRoleName = (user) => {
        if (!user) return "";
        return user.RoleID === 1 ? "Admin" : "User";
    };

    if (!user) {
        return (
            <div className="px-6 pb-6 pt-6 w-full bg-gray-100 min-h-screen">
                <Header pageTitle="Profile" showSearch={false} />
                <p className="text-center mt-12 text-gray-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="px-6 pb-6 pt-6 w-full bg-gray-100 min-h-screen">
            <Header pageTitle="Profile" showSearch={false} />

            <div className="max-w-3xl mx-auto mt-8 relative">
                {/* Top row: Header-aligned Edit button */}
                <div className="flex justify-between items-center mb-4">
                    <div></div> {/* Placeholder to push button to right */}
                    <button
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                        onClick={() => setModalOpen(true)}
                    >
                        Edit Profile
                    </button>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-visible relative text-center">
                    {/* Top gradient background */}
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-32 relative">
                        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                            <img
                                src={user.ProfilePic || "/default-avatar.png"}
                                alt="Profile"
                                className="w-32 h-32 rounded-full border-4 border-white shadow-xl"
                            />
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="mt-10 pt-4 pb-8 px-6 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 mt-4">
                            {user.FirstName}
                            {user.MiddleInitial ? ` ${user.MiddleInitial}.` : ""} {user.LastName}
                        </h2>
                        <p className="text-black-500 mt-2">{user.Email}</p>

                        {/* Role Badge */}
                        <div className="mt-3 text-center">
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${user.RoleID === 1
                                    ? "bg-purple-100 text-purple-800"
                                    : user.RoleID === 2
                                        ? "bg-blue-100 text-blue-800"
                                        : user.RoleID === 3
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                    }`}
                            >
                                {getRoleName(user) || "Unassigned"}
                            </span>
                        </div>

                    </div>

                    {/* Additional Info */}
                    <div className="border-t border-gray-200 px-6 py-4 text-left">
                        <h3 className="text-black-800 text-xl font-bold  mb-2">User Details</h3>
                        <p className="text-black-600">
                            <span className="font-bold">First Name:</span> {user.FirstName} <br />
                            <span className="font-bold">Middle Initial:</span> {user.MiddleInitial || "-"} <br />
                            <span className="font-bold">Last Name:</span> {user.LastName} <br />
                            <span className="font-bold">Email:</span> {user.Email} <br />
                            <span className="font-bold">Role:</span> {getRoleName(user)}
                        </p>
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

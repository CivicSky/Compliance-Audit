import React, { useEffect, useState } from "react";
import Header from "../Header/header";
import { usersAPI } from "../../utils/api";

export default function Profile() {
    const [user, setUser] = useState(null);

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
        return user.role === "admin" || user.RoleID === 1 ? "Admin" : "User";
    };

    return (
        <div className="px-6 pb-6 pt-6 w-full bg-gray-100 min-h-screen">
            <Header pageTitle="Profile" showSearch={false} />

            {!user ? (
                <p className="text-center mt-12 text-gray-500">Loading...</p>
            ) : (
                <div className="max-w-3xl mx-auto mt-8">
                    {/* Profile Card */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        {/* Top gradient background */}
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-32 relative">
                            {user.ProfilePic && (
                                <img
                                    src={user.ProfilePic}
                                    alt="Profile"
                                    className="w-32 h-32 rounded-full border-4 border-white shadow-xl absolute -bottom-16 left-1/2 transform -translate-x-1/2"
                                />
                            )}
                        </div>

                        {/* User Info */}
                        <div className="pt-20 pb-8 px-6 text-center">
                            <h2 className="text-2xl font-bold text-gray-800">
                                {user.FirstName}
                                {user.MiddleInitial ? ` ${user.MiddleInitial}.` : ""}{" "}
                                {user.LastName}
                            </h2>
                            <p className="text-gray-500 mt-2">{user.Email}</p>
                            <span className="inline-block mt-3 px-4 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                                {getRoleName(user)}
                            </span>
                        </div>

                        {/* Additional Info */}
                        <div className="border-t border-gray-200 px-6 py-4 text-left">
                            <h3 className="text-black-700 font-bold mb-2">Details</h3>
                            <p className="text-black-500">
                                <span className="font-bold">First Name:</span> {user.FirstName} <br />
                                <span className="font-bold">Middle Initial:</span> {user.MiddleInitial || "-"} <br />
                                <span className="font-bold">Last Name:</span> {user.LastName} <br />
                                <span className="font-bold">Email:</span> {user.Email} <br />
                                <span className="font-bold">Role:</span> {getRoleName(user)}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import React from "react";
import Header from "../Header/header"


export default function Profile() {
    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header pageTitle="Profile" showSearch={false} />

            <div className="relative z-10">
                <div className="mt-6">
                    <p className="text-gray-600">Profile page content will go here.</p>
                </div>
            </div>
        </div>
    );
};




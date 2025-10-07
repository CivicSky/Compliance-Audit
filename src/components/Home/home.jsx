import React from "react";
import { useNavigate } from "react-router-dom";

const Home = ()=>{
    return(
        <div className="ml-72 mt-4 p-6 "
        >
            
            <div className="relative z-10">
                <div className="bg-white shadow-xl rounded-2xl p-6 flex items-center justify-center gap-4 mb-10 sticky top-4">
                    <img src="/images/lccb_logo.png"
                         alt="Logo"
                         className="h-10 w-10 object-contain"/>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Compliance Audity
                    </h1>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="relative bg-white shadow-md rounded-2xl p-6 text-center hover:scale-105 transition-transform overflow-hidden">
                        <img 
                            src="/images/organization.svg"
                            alt="background"
                            className="absolute top-2 right-2 w-30 h-30 opacity-15"
                        />
                        <h2 className="text-lg font-semibold text-gray-700">Organizations</h2>
                        <p className="text-3xl font-bold text-blue-600 mt-2">12</p>
                    </div>
                    <div className="bg-white shadow-md rounded-2xl p-6 text-center hover:scale-105 transition-transform">
                        <img 
                            src="/images/organizations.svg"
                            alt="background"
                            className="absolute top-2 right-2 w-10 h-10 -z-10 opacity-30"
                        />
                        <h2 className="text-lg font-semibold text-gray-700">User</h2>
                        <p className="text-3xl font-bold text-blue-600 mt-2">245</p>
                    </div>
                    <div className="bg-white shadow-md rounded-2xl p-6 text-center hover:scale-105 transition-transform">
                        <h2 className="text-lg font-semibold text-gray-700">Total Audits</h2>
                        <p className="text-3xl font-bold text-blue-600 mt-2">58</p>
                    </div>
                    <div className="bg-white shadow-md rounded-2xl p-6 text-center hover:scale-105 transition-transform">
                        <h2 className="text-lg font-semibold text-gray-700">Pending Audits</h2>
                        <p className="text-3xl font-bold text-blue-600 mt-2">7</p>
                    </div>
                </div>
            </div>
        </div>
    );
};



export default Home;
import React from "react";
import Header from "../Header/header"

export default function Home() {
    return (
        <div className="ml-72 px-6 pb-6 pt-0">
            <Header />

            <div className="relative z-10">


                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
                    <div className="relative bg-white shadow-md rounded-2xl p-6 text-center hover:scale-105 transition-transform border-2 border-slate-400">
                        <img
                            src="/images/organization.svg"
                            alt="background"
                            className="absolute top-3 right-3 w-10 h-10 opacity-20"
                        />
                        <h2 className="text-lg font-semibold text-gray-700">Organizations</h2>
                        <p className="text-3xl font-bold text-blue-600 mt-2">17</p>
                    </div>
                    <div className="relative bg-white shadow-md rounded-2xl p-6 text-center hover:scale-105 transition-transform border-2 border-slate-400">
                        <img
                            src="/images/user.svg"
                            alt="background"
                            className="absolute top-3 right-3 w-10 h-10 opacity-20"
                        />
                        <h2 className="text-lg font-semibold text-gray-700">User</h2>
                        <p className="text-3xl font-bold text-blue-600 mt-2">245</p>
                    </div>
                    <div className="relative bg-white shadow-md rounded-2xl p-6 text-center hover:scale-105 transition-transform border-2 border-slate-400">
                        <img
                            src="/images/audit.svg"
                            alt="background"
                            className="absolute top-3 right-3 w-10 h-10 opacity-20"
                        />
                        <h2 className="text-lg font-semibold text-gray-700">Total Audits</h2>
                        <p className="text-3xl font-bold text-blue-600 mt-2">58</p>
                    </div>
                    <div className="relative bg-white shadow-md rounded-2xl p-6 text-center hover:scale-105 transition-transform border-2 border-slate-400">
                        <img
                            src="/images/pending.svg"
                            alt="background"
                            className="absolute top-3 right-3 w-10 h-10 opacity-20"
                        />
                        <h2 className="text-lg font-semibold text-gray-700">Pending Audits</h2>
                        <p className="text-3xl font-bold text-blue-600 mt-2">7</p>
                    </div>

                    <div className="mt-8 bg-white shadow-lg rounded-2xl p-6 border-2 border-slate-400 w-[760px]">

                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-semibold text-slate-800">Recent Logs</h1>
                            <button className="text-sm text-blue-600 hover:underline">
                                View All
                            </button>
                        </div>


                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">

                            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition">
                                <div className="w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                                <div>
                                    <p className="text-sm text-gray-700">
                                        <span className="font-medium">ABC Corp</span> completed Fire Safety Compliance.
                                    </p>
                                    <p className="text-xs text-gray-400">2 hours ago</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition">
                                <div className="w-2 h-2 mt-2 rounded-full bg-red-500"></div>
                                <div>
                                    <p className="text-sm text-gray-700">
                                        <span className="font-medium">XYZ Industries</span> failed Data Protection Policy.
                                    </p>
                                    <p className="text-xs text-gray-400">5 hours ago</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition">
                                <div className="w-2 h-2 mt-2 rounded-full bg-yellow-400"></div>
                                <div>
                                    <p className="text-sm text-gray-700">
                                        <span className="font-medium">LMN Group</span> pending Environmental Standards review.
                                    </p>
                                    <p className="text-xs text-gray-400">Yesterday</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};




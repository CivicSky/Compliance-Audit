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

                    <div className="bg-white shadow-xl rounded-2xl p-6 flex items-center justify-center gap-4 border-2 border-slate-400 w-[760px]">
                        <h1 className="text-lg font-semibold text-gray-700">
                            Recent Logs
                        </h1>
                        <h2 className="text-base font-semibold text-gray-700">
                            
                        </h2>
                    </div>
                </div>
            </div>
        </div>
    );
};




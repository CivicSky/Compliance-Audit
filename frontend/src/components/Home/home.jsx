import React from "react";
import Header from "../Header/header"
import org from "../../assets/images/organization.svg"
import user from "../../assets/images/user.svg"
import audit from "../../assets/images/audit.svg"
import pending from "../../assets/images/pending.svg"

export default function Home() {
    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header pageTitle="Dashboard"/>

            <div className="relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <div className="relative bg-white rounded-md p-4 text-center shadow-md hover:shadow-lg hover:bg-gray-50 transform transition-all duration-300 border border-gray-200">
                        <img
                            src={org}
                            alt="background"
                            className="absolute top-2 right-2 w-6 h-6 opacity-20"
                        />
                        <h2 className="text-sm font-semibold text-gray-700">Offices</h2>
                        <p className="text-2xl font-bold text-blue-600 mt-1">17</p>
                    </div>
                    <div className="relative bg-white rounded-md p-4 text-center shadow-md hover:shadow-lg hover:bg-gray-50 transform transition-all duration-300 border border-gray-200">
                        <img
                            src={user}
                            alt="background"
                            className="absolute top-2 right-2 w-6 h-6 opacity-20"
                        />
                        <h2 className="text-sm font-semibold text-gray-700">Compiled</h2>
                        <p className="text-2xl font-bold text-blue-600 mt-1">245</p>
                    </div>
                    <div className="relative bg-white rounded-md p-4 text-center shadow-md hover:shadow-lg hover:bg-gray-50 transform transition-all duration-300 border border-gray-200">
                        <img
                            src={audit}
                            alt="background"
                            className="absolute top-2 right-2 w-6 h-6 opacity-20"
                        />
                        <h2 className="text-sm font-semibold text-gray-700">Not Compiled</h2>
                        <p className="text-2xl font-bold text-blue-600 mt-1">58</p>
                    </div>
                    <div className="relative bg-white rounded-md p-4 text-center shadow-md hover:shadow-lg hover:bg-gray-50 transform transition-all duration-300 border border-gray-200">
                        <img
                            src={pending}
                            alt="background"
                            className="absolute top-2 right-2 w-6 h-6 opacity-20"
                        />
                        <h2 className="text-sm font-semibold text-gray-700">Compiled</h2>
                        <p className="text-2xl font-bold text-blue-600 mt-1">7</p>
                    </div>

                    <div className="mt-4 bg-white shadow-md rounded-md p-4 border border-gray-200 w-full max-w-4xl">

                        <div className="flex items-center justify-between mb-3">
                            <h1 className="text-lg font-semibold text-slate-800">Recent Logs</h1>
                            <button className="text-xs text-blue-600 hover:underline">
                                View All
                            </button>
                        </div>


                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">


                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};




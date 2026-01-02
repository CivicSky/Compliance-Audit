import React, { useEffect, useState } from "react";
import { complianceStatusOfficesAPI } from "../../utils/api";
import Header from "../Header/header"
import UnifiedSetupWizard from "../UnifiedSetupWizard/UnifiedSetupWizard"
import org from "../../assets/images/organization.svg"
import user from "../../assets/images/user.svg"
import audit from "../../assets/images/audit.svg"
import pending from "../../assets/images/pending.svg"
import { Plus } from "lucide-react"

export default function Home() {
    const [complianceData, setComplianceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showWizard, setShowWizard] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await complianceStatusOfficesAPI.getAll();
                setComplianceData(data);
            } catch (err) {
                setError("Failed to fetch compliance status data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);


    // Group by OfficeID and determine compilation status per office
    const officeMap = {};
    complianceData.forEach(item => {
        if (!officeMap[item.OfficeID]) officeMap[item.OfficeID] = [];
        officeMap[item.OfficeID].push(item.Status);
    });

    let compiledOffices = 0;
    let notCompiledOffices = 0;
    let partialOffices = 0;
    Object.values(officeMap).forEach(statuses => {
        const allCompiled = statuses.every(s => s === 5);
        const allNotCompiled = statuses.every(s => s === 3);
        if (allCompiled) compiledOffices++;
        else if (allNotCompiled) notCompiledOffices++;
        else partialOffices++;
    });

    const officesCount = Object.keys(officeMap).length;

    if (loading) return <div className="p-6">Loading dashboard...</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;

    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <div className="flex items-center justify-between mb-6">
                <Header pageTitle="Dashboard"/>
                <button 
                    onClick={() => setShowWizard(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition transform hover:scale-105"
                >
                    <Plus size={20} /> Quick Setup
                </button>
            </div>

            <UnifiedSetupWizard 
                isOpen={showWizard} 
                onClose={() => setShowWizard(false)}
                onSuccess={() => {
                    // Refresh compliance data after successful setup
                    const fetchData = async () => {
                        try {
                            const data = await complianceStatusOfficesAPI.getAll();
                            setComplianceData(data);
                        } catch (err) {
                            console.error("Failed to refresh data");
                        }
                    };
                    fetchData();
                }}
            />

            <div className="relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <div className="relative bg-white rounded-md p-4 text-center shadow-md hover:shadow-lg hover:bg-gray-50 transform transition-all duration-300 border border-gray-200">
                        <img
                            src={org}
                            alt="background"
                            className="absolute top-2 right-2 w-6 h-6 opacity-20"
                        />
                        <h2 className="text-sm font-semibold text-gray-700">Offices</h2>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{officesCount}</p>
                    </div>
                    <div className="relative bg-white rounded-md p-4 text-center shadow-md hover:shadow-lg hover:bg-gray-50 transform transition-all duration-300 border border-gray-200">
                        <img
                            src={user}
                            alt="background"
                            className="absolute top-2 right-2 w-6 h-6 opacity-20"
                        />
                        <h2 className="text-sm font-semibold text-gray-700">Compiled Offices</h2>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{compiledOffices}</p>
                    </div>
                    <div className="relative bg-white rounded-md p-4 text-center shadow-md hover:shadow-lg hover:bg-gray-50 transform transition-all duration-300 border border-gray-200">
                        <img
                            src={audit}
                            alt="background"
                            className="absolute top-2 right-2 w-6 h-6 opacity-20"
                        />
                        <h2 className="text-sm font-semibold text-gray-700">Not Compiled Offices</h2>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{notCompiledOffices}</p>
                    </div>
                    <div className="relative bg-white rounded-md p-4 text-center shadow-md hover:shadow-lg hover:bg-gray-50 transform transition-all duration-300 border border-gray-200">
                        <img
                            src={pending}
                            alt="background"
                            className="absolute top-2 right-2 w-6 h-6 opacity-20"
                        />
                        <h2 className="text-sm font-semibold text-gray-700">Partially Compiled Offices</h2>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{partialOffices}</p>
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




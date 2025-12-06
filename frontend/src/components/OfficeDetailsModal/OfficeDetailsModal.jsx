import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function OfficeDetailsModal({ isOpen, onClose, office, onEditOffice, onAddRequirements }) {
    const [showMenu, setShowMenu] = useState(false);
    const [requirements, setRequirements] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && office) {
            fetchOfficeRequirements();
        }
    }, [isOpen, office]);

    const fetchOfficeRequirements = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`http://localhost:5000/api/offices/${office.id}/requirements`);
            setRequirements(response.data.data || []);
        } catch (error) {
            console.error('Error fetching requirements:', error);
            setRequirements([]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !office) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-auto" onClick={onClose}>
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8 flex flex-col ml-64 h-[85vh]" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{office.office_name}</h2>
                            <p className="text-sm text-blue-100">{office.office_type_name}</p>
                        </div>
                    </div>

                    {/* 3-Dots Menu and Close Button */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {showMenu && (
                                <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-56 z-10">
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            onEditOffice(office);
                                        }}
                                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-blue-50 flex items-center gap-3"
                                    >
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span className="text-sm font-medium">Edit Office Info</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            onAddRequirements(office);
                                        }}
                                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-green-50 flex items-center gap-3"
                                    >
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span className="text-sm font-medium">Add Requirements</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Office Info */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <img
                            src={office.head_profile_pic 
                                ? `http://localhost:5000/uploads/profile-pics/${office.head_profile_pic}`
                                : '/src/assets/images/user.svg'}
                            alt={office.head_name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
                        />
                        <div>
                            <p className="text-sm text-gray-500">Office Head</p>
                            <p className="font-semibold text-gray-800">{office.head_name}</p>
                        </div>
                    </div>
                </div>

                {/* Requirements List */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Requirements</h3>
                    
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : requirements.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 font-medium">No requirements assigned yet</p>
                            <p className="text-sm text-gray-400 mt-1">Click "Add Requirements" to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requirements.map((req) => (
                                <div key={req.RequirementID} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-800">{req.RequirementCode}</h4>
                                            <p className="text-sm text-gray-600 mt-1">{req.Description}</p>
                                            {req.CriteriaCode && (
                                                <p className="text-xs text-blue-600 mt-2">
                                                    <span className="font-medium">Criteria:</span> {req.CriteriaCode} - {req.CriteriaName}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-3 ${
                                            req.ComplianceStatus === 'Complied' ? 'bg-green-100 text-green-800' :
                                            req.ComplianceStatus === 'Partially Complied' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {req.ComplianceStatus || 'Not Complied'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
            </div>
        </div>
    );
}

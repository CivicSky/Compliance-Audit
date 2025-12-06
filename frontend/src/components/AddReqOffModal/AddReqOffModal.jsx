import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AddReqOffModal({ isOpen, onClose, office, onSave }) {
    const [requirements, setRequirements] = useState([]);
    const [selectedRequirements, setSelectedRequirements] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && office) {
            fetchEventRequirements();
        }
    }, [isOpen, office]);

    const fetchEventRequirements = async () => {
        setLoading(true);
        try {
            // Fetch all requirements for the office's event
            const response = await axios.get(`http://localhost:5000/api/requirements/all?eventId=${office.event_id}`);
            const allRequirements = response.data.data || [];
            console.log('All requirements for event:', allRequirements);
            console.log('First requirement:', JSON.stringify(allRequirements[0], null, 2));

            // Fetch current office requirements
            const officeReqResponse = await axios.get(`http://localhost:5000/api/offices/${office.id}/requirements`);
            const officeRequirements = officeReqResponse.data.data || [];
            const officeReqIds = officeRequirements.map(r => r.RequirementID);

            // Filter out requirements already assigned to office
            const availableReqs = allRequirements.filter(req => !officeReqIds.includes(req.RequirementID));
            console.log('Available requirements:', availableReqs);
            console.log('Available requirement details:', JSON.stringify(availableReqs, null, 2));
            setRequirements(availableReqs);
        } catch (error) {
            console.error('Error fetching requirements:', error);
            setRequirements([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRequirement = (reqId) => {
        setSelectedRequirements(prev =>
            prev.includes(reqId)
                ? prev.filter(id => id !== reqId)
                : [...prev, reqId]
        );
    };

    const handleSelectAll = () => {
        const filtered = getFilteredRequirements();
        if (selectedRequirements.length === filtered.length) {
            setSelectedRequirements([]);
        } else {
            setSelectedRequirements(filtered.map(r => r.RequirementID));
        }
    };

    const handleSave = async () => {
        if (selectedRequirements.length === 0) return;

        setSaving(true);
        try {
            await axios.post(`http://localhost:5000/api/offices/${office.id}/requirements`, {
                requirementIds: selectedRequirements
            });
            
            onSave();
            setSelectedRequirements([]);
            onClose();
        } catch (error) {
            console.error('Error adding requirements:', error);
            alert('Failed to add requirements. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const getFilteredRequirements = () => {
        return requirements.filter(req =>
            (req.RequirementCode && req.RequirementCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (req.Description && req.Description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (req.CriteriaCode && req.CriteriaCode.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    };

    if (!isOpen || !office) return null;

    const filteredRequirements = getFilteredRequirements();

    return (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-auto" onClick={onClose}>
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col ml-64 h-[85vh]" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Add Requirements</h2>
                                <p className="text-sm text-green-100">{office.office_name}</p>
                            </div>
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

                    {/* Search and Select All */}
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 space-y-3 flex-shrink-0">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search requirements by code, description, or criteria..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <div className="flex items-center justify-between">
                            <button
                                onClick={handleSelectAll}
                                className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-2"
                            >
                                <input
                                    type="checkbox"
                                    checked={filteredRequirements.length > 0 && selectedRequirements.length === filteredRequirements.length}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                Select All ({filteredRequirements.length})
                            </button>
                            <span className="text-sm text-gray-600">
                                {selectedRequirements.length} selected
                            </span>
                        </div>
                    </div>

                    {/* Requirements List */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                            </div>
                        ) : filteredRequirements.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-500 font-medium">
                                    {searchTerm ? 'No requirements match your search' : 'All requirements are already assigned'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredRequirements.map((req) => (
                                    <div
                                        key={req.RequirementID}
                                        onClick={() => handleToggleRequirement(req.RequirementID)}
                                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                            selectedRequirements.includes(req.RequirementID)
                                                ? 'bg-green-50 border-green-300 shadow-sm'
                                                : 'bg-white border-gray-200 hover:border-green-200 hover:bg-green-50/30'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedRequirements.includes(req.RequirementID)}
                                                onChange={() => handleToggleRequirement(req.RequirementID)}
                                                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-0.5"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-gray-800">
                                                            {req.RequirementCode || 'No Code'}
                                                        </h4>
                                                        <p className="text-sm text-gray-600 mt-1">{req.Description}</p>
                                                        {req.CriteriaCode && (
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                                                    {req.CriteriaCode}
                                                                </span>
                                                                <span className="text-xs text-gray-600">
                                                                    {req.CriteriaName}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {req.EventName && (
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0">
                                                            {req.EventName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                        <p className="text-sm text-gray-600">
                            {selectedRequirements.length} requirement{selectedRequirements.length !== 1 ? 's' : ''} selected
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={selectedRequirements.length === 0 || saving}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Add Requirements
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

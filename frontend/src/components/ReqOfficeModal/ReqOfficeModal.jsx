import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AddRequirementsModal({ isOpen, onClose, office, onSave }) {
    const [allRequirements, setAllRequirements] = useState([]);
    const [selectedRequirements, setSelectedRequirements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen && office) {
            fetchEventRequirements();
        }
    }, [isOpen, office]);

    const fetchEventRequirements = async () => {
        setLoading(true);
        try {
            // Fetch all requirements for this office's event
            const response = await axios.get(`http://localhost:5000/api/requirements/event/${office.event_id}`);
            console.log('Requirements response:', response.data);
            
            // Handle different response formats
            const data = response.data?.data || response.data;
            setAllRequirements(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching requirements:', error);
            setAllRequirements([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRequirement = (requirementId) => {
        setSelectedRequirements(prev => {
            if (prev.includes(requirementId)) {
                return prev.filter(id => id !== requirementId);
            } else {
                return [...prev, requirementId];
            }
        });
    };

    const handleSelectAll = () => {
        const filtered = getFilteredRequirements();
        if (selectedRequirements.length === filtered.length) {
            setSelectedRequirements([]);
        } else {
            setSelectedRequirements(filtered.map(req => req.RequirementID));
        }
    };

    const handleSave = async () => {
        if (selectedRequirements.length === 0) {
            alert('Please select at least one requirement');
            return;
        }

        setLoading(true);
        try {
            // TODO: API call to assign requirements to office
            await axios.post(`http://localhost:5000/api/offices/${office.office_id}/requirements`, {
                requirementIds: selectedRequirements
            });
            
            onSave();
            onClose();
            setSelectedRequirements([]);
        } catch (error) {
            console.error('Error saving requirements:', error);
            alert('Failed to add requirements. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredRequirements = () => {
        if (!Array.isArray(allRequirements)) {
            return [];
        }
        return allRequirements.filter(req => 
            req.RequirementCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.Description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    if (!isOpen) return null;

    const filteredRequirements = getFilteredRequirements();
    const allSelected = filteredRequirements.length > 0 && selectedRequirements.length === filteredRequirements.length;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-auto" onClick={onClose}>
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8 flex flex-col ml-64 h-[85vh]" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold">Add Requirements</h2>
                            <p className="text-sm text-green-100 mt-1">{office?.office_name}</p>
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

                {/* Search and Select All */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 space-y-3 flex-shrink-0">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search requirements by code or description..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={handleSelectAll}
                                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Select All</span>
                        </label>
                        <span className="text-sm text-gray-500">
                            {selectedRequirements.length} of {filteredRequirements.length} selected
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
                                {searchTerm ? 'No requirements match your search' : 'No requirements available'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredRequirements.map((requirement) => (
                                <label
                                    key={requirement.RequirementID}
                                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        selectedRequirements.includes(requirement.RequirementID)
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedRequirements.includes(requirement.RequirementID)}
                                        onChange={() => handleToggleRequirement(requirement.RequirementID)}
                                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500 mt-0.5"
                                    />
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-800">
                                            {requirement.RequirementCode}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {requirement.Description}
                                        </p>
                                        {requirement.CriteriaCode && (
                                            <div className="mt-2 text-xs">
                                                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                                                    Criteria: {requirement.CriteriaCode} - {requirement.CriteriaName}
                                                </span>
                                            </div>
                                        )}
                                        {requirement.EventCode && (
                                            <div className="mt-1 text-xs">
                                                <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">
                                                    Event: {requirement.EventCode} - {requirement.EventName}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
                    <div className="text-sm text-gray-600">
                        <span className="font-semibold text-green-600">{selectedRequirements.length}</span> requirement(s) selected
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || selectedRequirements.length === 0}
                            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Adding...' : `Add ${selectedRequirements.length} Requirement${selectedRequirements.length !== 1 ? 's' : ''}`}
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}

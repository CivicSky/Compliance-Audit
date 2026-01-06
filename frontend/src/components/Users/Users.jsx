import React, { useEffect, useState } from "react";
import Header from "../Header/header"
import UsersP from "../UsersProfile/UsersProfle";
import UserEditApproval from "../usereditapproval/usereditapproval";
import { usersAPI } from "../../utils/api";


export default function Users() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOptions, setFilterOptions] = useState({
        approvalStatus: []
    });
    const [selectedUser, setSelectedUser] = useState(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [updating, setUpdating] = useState(false);
    const usersRef = React.useRef();

    useEffect(() => {
        const handleClickOutside = (event) => { /* ... */ };
        const handleEscapeKey = (event) => { /* ... */ };
        
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, []);

    const handleSearchChange = (value) => {
        setSearchTerm(value);
    };

    const handleFilterChange = (filters) => {
        setFilterOptions(filters);
    };

    const handleUserClick = (user) => {
        setSelectedUser(user);
        setShowApprovalModal(true);
    };

    const handleCloseModal = () => {
        setShowApprovalModal(false);
        setSelectedUser(null);
    };

    const handleUpdateSuccess = () => {
        // Refresh users list
        if (usersRef.current && usersRef.current.refresh) {
            usersRef.current.refresh();
        }
    };

    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header 
                pageTitle="Users"
                onSearchChange={handleSearchChange}
                searchValue={searchTerm}
                onFilterChange={handleFilterChange}
                filterOptions={filterOptions}
                showApprovalFilter={true}
            />

            <div className="relative z-10">
                <div className="mt-6">
                    <UsersP 
                        ref={usersRef}
                        searchTerm={searchTerm}
                        filterOptions={filterOptions}
                        onUserClick={handleUserClick}
                    />
                </div>
            </div>

            {/* Approval Status Modal Component */}
            {showApprovalModal && selectedUser && (
                <UserEditApproval 
                    selectedUser={selectedUser}
                    onClose={handleCloseModal}
                    onSuccess={handleUpdateSuccess}
                />
            )}
        </div>
    );
};




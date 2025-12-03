import React, { useEffect } from "react";
import Header from "../Header/header"
import UsersP from "../UsersProfile/UsersProfle";


export default function Users() {
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

    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header pageTitle="Users" />

            <div className="relative z-10">
                <div className="mt-6">
                    <UsersP/>
                </div>
            </div>
        </div>
    );
};




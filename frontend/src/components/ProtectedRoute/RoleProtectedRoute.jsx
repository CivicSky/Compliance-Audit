import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { usersAPI } from "../../utils/api";

export default function RoleProtectedRoute({ allowedRoles = [], forbiddenRoles = [], children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const fetchUser = async () => {
            try {
                const res = await usersAPI.getLoggedInUser();
                if (mounted && res?.success) {
                    setCurrentUser(res.user);
                }
            } catch (err) {
                console.error("RoleProtectedRoute error:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchUser();
        return () => { mounted = false; };
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    const token = localStorage.getItem("token");
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const userRoleId = Number(currentUser?.RoleID);
    const userRoleName = String(currentUser?.RoleName || '').toLowerCase();
    const isAuditor = userRoleId === 4 || userRoleName.includes('auditor') || currentUser?.isExternalAuditor;

    // Check forbidden roles
    if (forbiddenRoles.length > 0) {
        if (forbiddenRoles.includes('auditor') && isAuditor) {
            return <Navigate to="/home" replace />;
        }
        if (forbiddenRoles.includes(userRoleId)) {
            return <Navigate to="/home" replace />;
        }
    }

    // Check allowed roles if specified
    if (allowedRoles.length > 0) {
        const isAllowed = allowedRoles.includes(userRoleId) || 
                          allowedRoles.some(r => typeof r === 'string' && r.toLowerCase() === userRoleName);
        if (!isAllowed) {
            return <Navigate to="/home" replace />;
        }
    }

    return children;
}

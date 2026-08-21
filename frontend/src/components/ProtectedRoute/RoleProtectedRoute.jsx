import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usersAPI } from "../../utils/api";
import { DashboardSkeleton, CardListSkeleton } from "../UI/Skeleton";

export default function RoleProtectedRoute({ allowedRoles = [], forbiddenRoles = [], children }) {
    const location = useLocation();
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
        const isDashboard = location.pathname === '/home' || location.pathname === '/home/';
        return (
            <div className="w-full p-6">
                {isDashboard ? <DashboardSkeleton /> : <CardListSkeleton count={4} />}
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

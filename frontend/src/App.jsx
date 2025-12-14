import './index.css'
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";


import Login from './components/Login/login.jsx'
import Register from './components/Register/register.jsx'
import Home from './components/Home/home.jsx'
import AppLayout from './AppLayout/AppLayout.jsx'
import Organization from './components/Organization/organization.jsx'
import Audit from './components/Audit/audit.jsx'
import OfficeHead from './components/OfficeHead/OfficeHead.jsx'
import Requirements from './components/Requirement/requirement.jsx'
import Profile from './components/Profile/Profile.jsx'
import Users from './components/Users/Users.jsx'
import Events from './components/Events/Events.jsx'
import Criteria from './components/Criteria/Criteria.jsx'
import AuditLogs from './components/AuditLogs/AuditLogs.jsx'
import Area from './components/Area/Area.jsx'
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute.jsx";
import PublicRoute from "./components/ProtectedRoute/PublicRoute.jsx";

export default function App() {
  const router = createBrowserRouter([
    {
      path: "/login",
      element: (
        <PublicRoute>
          <Login />
        </PublicRoute>
      ),
    },
    {
      path: "/register",
      element: (
        <PublicRoute>
          <Register />
        </PublicRoute>
      ),
    },
    {
      path: "/home",
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Home /> },
        { path: "organizations", element: <Organization /> },
        { path: "audit", element: <Audit /> },
        { path: "requirements", element: <Requirements /> },
        { path: "officehead", element: <OfficeHead /> },
        { path: "users", element: <Users /> },
        { path: "events", element: <Events /> },
        { path: "criteria", element: <Criteria /> },
        { path: "audit-logs", element: <AuditLogs /> },
        { path: "profile", element: <Profile /> },
        { path: "area", element: <Area /> },
      ],
    },
  
    { path: "/", element: <Navigate to="/login" replace /> },
  ]);


  return <RouterProvider router={router} />
}

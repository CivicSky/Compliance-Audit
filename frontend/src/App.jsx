import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import Login from './components/Login/login.jsx'
import Register from './components/Register/register.jsx'
import Home from './components/Home/home.jsx'
import AppLayout from './AppLayout/AppLayout.jsx'
import Organization from './components/Organization/organization.jsx'
import Audit from './components/Audit/audit.jsx'
import OfficeHead from './components/OfficeHead/OfficeHead.jsx'
import Requirements from './components/requirements/requirements.jsx'
import Profile from './components/Profile/Profile.jsx'
import Users from './components/Users/Users.jsx'
import Events from './components/Events/Events.jsx'
import AuditLogs from './components/AuditLogs/AuditLogs.jsx'

export default function App() {
  const router = createBrowserRouter([
    { path: '/', element: <Login /> },
    { path: '/register', element: <Register /> },
    {
      path: '/home',
      element: <AppLayout />,
      children: [
        { index: true, element: <Home /> },
        { path: 'organizations', element: <Organization/>},
        { path: 'audit', element: <Audit/>},
        { path: 'requirements', element: <Requirements/>},
        { path: 'officehead', element: <OfficeHead/>},
        { path: 'users', element: <Users/>},
        { path: 'events', element: <Events/>},
        { path: 'audit-logs', element: <AuditLogs/>},
        { path: 'profile', element: <Profile/>},
      ],
    },
  ])

  return <RouterProvider router={router} />
}

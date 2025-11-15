import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import Login from './components/Login/login.jsx'
import Register from './components/Register/register.jsx'
import Home from './components/Home/home.jsx'
import NotFoundPage from './components/NotFoundPage/notfoundpage.jsx'
import AppLayout from './AppLayout/AppLayout.jsx'
import Organization from './components/Organization/organization.jsx'
import Audit from './components/Audit/audit.jsx'

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
      ],
    },
    { path: '*', element: <NotFoundPage /> },
  ])

  return <RouterProvider router={router} />
}

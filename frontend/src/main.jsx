import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Login from './components/Login/login.jsx';
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import NotFoundPage from './components/NotFoundPage/notfoundpage.jsx';
import Register from './components/Register/register.jsx'
import Home from './components/Home/home.jsx';
import AppLayout from './AppLayout/AppLayout.jsx';

const router = createBrowserRouter([
  { path: "/", element: <Login/>},
   { path:"*", element:<NotFoundPage/>},
   { path:"/register", element:<Register/>},
   {path:"/home", 
     element:<AppLayout/>,
     children:[
      { path: "", element: <Home/>},
      { path: "organizations", element: <div>Organizations Page</div>}, 
     ],
   }
]);


createRoot(document.getElementById('root')).render(
  <StrictMode>
  <RouterProvider router={router}/>
  </StrictMode>
)

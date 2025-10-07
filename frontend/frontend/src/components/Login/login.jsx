import { react } from "react";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
    const navigate=useNavigate();
    
    return (
        <div
          className="relative flex justify-center items-center h-screen bg-cover bg-center"
          style={{ backgroundImage: "url('/images/login_bg.jpg')"}}
        >
          
          <div className="absolute inset-0 bg-black/50"></div>

          <div className="relative z-10 w-96">
            <div className="bg-white rounded-xl shadow-md px-6 py-6 flex items-center justify-center gap-3 mb-6">
                <img
                  src="/images/lccb_logo.png"
                  alt="App Logo"
                  className="w-12 h-12 mb-2"
                />
                <h1 className="text-lg font-bold text-gray-800">
                    Compliance and Audit
                </h1>
            </div>
        
       

             <form className="bg-white p-8 rounded shadow-md w-96">
                <h1 className="text-center text-2xl font-bold mb-6">Login</h1>

                <div className="mb-4">
                    <input 
                        type="email" 
                        placeholder="Email" 
                        required 
                        className="w-full p-2 border border-gray-300 rounded" 
                        />
                </div>
                <div className="mb-6">
                    <input 
                        type="password" 
                        placeholder="Password" 
                        required 
                        className="w-full p-2 border border-gray-300 rounded" 
                    />
                </div>

                <button 
                    type="submit" 
                    className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
                    onClick={() => navigate("Home/")}>
                    Login 
                </button>

                <div className="mt-4 text-center">
                    <p>
                        Don't have an account? <Link to="/register" className="text-blue-500 hover:underline">Sign up</Link>
                    </p>
                </div>
             </form>
            </div>
        </div>
    );
};

export default Login;

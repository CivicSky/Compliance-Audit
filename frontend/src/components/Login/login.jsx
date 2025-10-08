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

          <div className="relative z-10 w-auto">
                <div className="bg-white rounded-xl shadow-lg px-8 py-8 flex items-center justify-center gap-4 mb-6 border-2 border-slate-400">
                    <img
                    src="/images/lccb_logo.png"
                    alt="App Logo"
                    className="w-16 h-16"   
                    />
                    <h1 className="text-2xl font-bold text-gray-900">
                    Compliance and Audit
                    </h1>
                </div>
        
             <form className="bg-white p-8 rounded shadow-md w-96 border-2 border-slate-400">
                <h1 className="text-center text-2xl font-bold mb-6">Login</h1>

                <div className="mb-4">
                    <input 
                        type="email" 
                        placeholder="Email" 
                        required 
                        className="w-full p-2 border-2 border-slate-300 rounded" 
                        />
                </div>
                <div className="mb-6">
                    <input 
                        type="password" 
                        placeholder="Password" 
                        required 
                        className="w-full p-2 border-2 border-slate-300 rounded" 
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

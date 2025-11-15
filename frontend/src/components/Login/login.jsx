import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/images/lccb_logo.png"
import audittrackLogo from "../../assets/images/logo.png"
import bg from "../../assets/images/homebg.jpg"
import axios from "axios";

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            console.log('Attempting login with:', { email: formData.email });
            
            const response = await axios.post("http://localhost:3000/user/login", {
                email: formData.email,
                password: formData.password
            });

            console.log('Login response:', response.data);

            if (response.data.success) {
                // Store user data in localStorage or context
                localStorage.setItem("user", JSON.stringify(response.data.user));
                
                alert('Login successful! Redirecting to home...');
                // Redirect to home page
                navigate("/home");
            } else {
                setError(response.data.message || "Login failed");
            }
        } catch (err) {
            console.error('Login error full:', err);
            console.error('Error response:', err.response);
            setError(err.response?.data?.message || "Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Left side - Login form */}
            <div className="w-1/2 flex items-center justify-center bg-white transition-all duration-700 ease-in-out transform">
                <div className="w-full max-w-md px-8 animate-fade-in-left">
                    {/* Logo and title */}
                    <div className="text-center mb-8 animate-slide-down">
                        <img
                            src={logo}
                            alt="App Logo"
                            className="w-16 h-16 mx-auto mb-4 transition-transform duration-500 hover:scale-110"
                        />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2 transition-all duration-300">
                            Welcome back
                        </h1>
                        <p className="text-gray-600 transition-opacity duration-500">Please enter your details</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="transform transition-all duration-300 hover:translate-y-[-2px]">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 focus:scale-105"
                                placeholder="Enter your email"
                            />
                        </div>

                        <div className="transform transition-all duration-300 hover:translate-y-[-2px]">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 focus:scale-105"
                                placeholder="Enter your password"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-200"
                                />
                                <label htmlFor="remember" className="ml-2 text-sm text-gray-700">
                                    Remember for 30 days
                                </label>
                            </div>
                            <button type="button" className="text-sm text-blue-600 hover:text-blue-500 transition-colors duration-200">
                                Forgot password
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-md font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                                loading 
                                    ? "bg-blue-300 cursor-not-allowed text-white" 
                                    : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-200"
                            }`}
                        >
                            <span className={loading ? "animate-pulse" : ""}>
                                {loading ? "Signing in..." : "Sign in"}
                            </span>
                        </button>

                        <p className="text-center text-sm text-gray-600 transition-all duration-300">
                            Don't have an account?{" "}
                            <Link 
                                to="/register" 
                                className="text-blue-600 hover:text-blue-500 font-medium transition-all duration-200 hover:underline transform hover:scale-105 inline-block"
                            >
                                Sign up
                            </Link>
                        </p>
                    </form>
                </div>
            </div>

            {/* Right side - Background Image */}
            <div 
                className="w-1/2 flex items-center justify-center relative overflow-hidden transition-all duration-700 ease-in-out bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url(${bg})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover'
                }}
            >
                {/* Subtle blue overlay */}
                <div className="absolute inset-0 bg-blue-600 bg-opacity-20"></div>

                {/* Main content overlay */}
                <div className="relative z-10 text-center text-white max-w-md animate-fade-in-right">
                    <div className="mb-0">
                        {/* Audittrack Logo */}
                        <div className="relative mx-auto w-65 h-65 flex items-center justify-center mb-0">
                            <img
                                src={audittrackLogo}
                                alt="Audittrack Logo"
                                className="w-65 h-65 object-contain transition-all duration-500 hover:scale-105 drop-shadow-2xl"
                            />
                        </div>
                    </div>
                    
                    <h2 className="text-4xl font-bold mb-2 animate-slide-up drop-shadow-lg -mt-20">Audittrack</h2>
                    <p className="text-white text-lg animate-fade-in-delayed drop-shadow-md px-4">
                        Streamline Your Compliance processes with our comprehensive audit management systems
                    </p>
                </div>
            </div>
        </div>
    );
};


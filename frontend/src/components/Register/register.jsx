import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import bg from "../../assets/images/homebg.jpg"
import logo from "../../assets/images/lccb_logo.png"
import auditrackLogo from "../../assets/images/logo.png"
import axios from "axios";

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: "",
        middleInitial: "",
        lastName: "",
        email: "",
        password: "",
        roleId: "2" // Default to User role (2)
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
            console.log('Submitting registration with data:', {
                firstName: formData.firstName,
                middleInitial: formData.middleInitial,
                lastName: formData.lastName,
                email: formData.email,
                roleId: parseInt(formData.roleId)
            });

            // Send registration data to backend API (backend mounts user routes at /user)
            const response = await axios.post("http://localhost:3000/user/register", {
                firstName: formData.firstName,
                middleInitial: formData.middleInitial,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                roleId: parseInt(formData.roleId)
            });

            console.log('Registration response:', response.data);

            if (response.data.success) {
                alert('Registration successful! Redirecting to login...');
                // Redirect to login page on success (login component is mounted at '/')
                navigate("/");
            } else {
                setError(response.data.message || "Registration failed");
            }
        } catch (err) {
            console.error('Registration error full:', err);
            console.error('Error response:', err.response);
            setError(err.response?.data?.message || "An error occurred during registration");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Left side - Background Image */}
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

                {/* Main illustration content */}
                <div className="relative z-10 text-center text-white max-w-md animate-fade-in-left">
                    <div className="mb-6">
                        {/* Auditrack Logo */}
                        <div className="relative mx-auto w-40 h-40 flex items-center justify-center mb-4">
                            <img
                                src={auditrackLogo}
                                alt="Auditrack Logo"
                                className="w-32 h-32 object-contain transition-all duration-500 hover:scale-105 drop-shadow-2xl"
                            />
                        </div>
                    </div>
                    
                    <h2 className="text-4xl font-bold mb-4 animate-slide-up drop-shadow-lg">Auditrack</h2>
                    <p className="text-white text-lg animate-fade-in-delayed drop-shadow-md px-4">
                        Create your account and start managing compliance processes efficiently.
                    </p>
                </div>
            </div>

            {/* Right side - Registration form */}
            <div className="w-1/2 flex items-center justify-center bg-white transition-all duration-700 ease-in-out transform">
                <div className="w-full max-w-md px-8 animate-fade-in-right">
                    {/* Logo and title */}
                    <div className="text-center mb-8 animate-slide-down">
                        <img
                            src={logo}
                            alt="App Logo"
                            className="w-16 h-16 mx-auto mb-4 transition-transform duration-500 hover:scale-110"
                        />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2 transition-all duration-300">
                            Create Account
                        </h1>
                        <p className="text-gray-600 transition-opacity duration-500">Please enter your details to register</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                                    First Name *
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    required
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="First name"
                                />
                            </div>

                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Name *
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    required
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Last name"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="middleInitial" className="block text-sm font-medium text-gray-700 mb-1">
                                Middle Initial
                            </label>
                            <input
                                type="text"
                                id="middleInitial"
                                name="middleInitial"
                                maxLength="1"
                                value={formData.middleInitial}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="M"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email address *
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="Enter your email"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password *
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="Create a password"
                            />
                        </div>

                        <div>
                            <label htmlFor="roleId" className="block text-sm font-medium text-gray-700 mb-1">
                                Account Type *
                            </label>
                            <select
                                id="roleId"
                                name="roleId"
                                value={formData.roleId}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                required
                            >
                                <option value="2">User</option>
                                <option value="1">Admin</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-2 px-4 rounded-md font-medium transition-colors text-sm ${
                                loading 
                                    ? "bg-blue-300 cursor-not-allowed text-white" 
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                        </button>

                        <p className="text-center text-sm text-gray-600">
                            Already have an account?{" "}
                            <Link to="/" className="text-blue-600 hover:text-blue-500 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

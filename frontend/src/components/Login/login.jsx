import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import logo from "../../assets/images/lccb_logo.png";
import auditrackLogo from "../../assets/images/logo.png";
import bg from "../../assets/images/bglogins.jpg";
import { usersAPI } from "../../utils/api";

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // 🔒 Redirect if already logged in
    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (token && user) {
            const userData = JSON.parse(user);
            const destination = userData.RoleID === 1 ? "/home" : "/home/organizations";
            navigate(destination, { replace: true });
        }
    }, [navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await usersAPI.login({
                email: formData.email,
                password: formData.password,
            });

            if (response.success) {
                // 🔐 Store token
                localStorage.setItem("token", response.token);
                localStorage.setItem("user", JSON.stringify(response.user));

                // 🔥 Attach token globally
                axios.defaults.headers.common["Authorization"] =
                    `Bearer ${response.token}`;

                // Redirect based on role: Admin to /home, User to /home/organizations
                const destination = response.user.RoleID === 1 ? "/home" : "/home/organizations";
                navigate(destination, { replace: true });
            } else {
                // Check approval status
                if (response.approvalStatus === 'pending') {
                    setError("Your account is pending approval. Please wait for admin approval.");
                    alert("⏳ Account Pending\n\nYour account is still pending approval. Please wait for the administrator to review your account.");
                } else if (response.approvalStatus === 'denied') {
                    setError("Your account has been denied access.");
                    alert("❌ Access Denied\n\nYour account has been denied access. Please contact the administrator for more information.");
                } else {
                    setError(response.message || "Login failed");
                }
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Invalid email or password"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Left side - Background */}
            <div
                className="w-1/2 bg-cover bg-center transition-all duration-700 ease-in-out"
                style={{ backgroundImage: `url(${bg})` }}
            >
                <div className="flex items-center justify-center h-full bg-blue-800 bg-opacity-60">
                    <div className="text-white text-center animate-fade-in-left">
                        <img src={auditrackLogo} className="w-32 mx-auto mb-4 transition-all duration-500 hover:scale-105 drop-shadow-2xl" />
                        <h2 className="text-4xl font-bold animate-slide-up drop-shadow-lg">Auditrack</h2>
                        <p className="mt-2 animate-fade-in-delayed drop-shadow-md">
                            Streamline your compliance processes
                        </p>
                    </div>
                </div>
            </div>

            {/* Right side - Login form */}
            <div className="w-1/2 flex items-center justify-center bg-white transition-all duration-700 ease-in-out transform">
                <div className="w-full max-w-md px-8 animate-fade-in-right">
                    <div className="text-center mb-8 animate-slide-down">
                        <img src={logo} alt="Logo" className="w-16 h-16 mx-auto mb-4 transition-transform duration-500 hover:scale-110" />
                        <h1 className="text-2xl font-bold text-gray-900 transition-all duration-300">Welcome back</h1>
                        <p className="text-gray-600 transition-opacity duration-500">Please enter your details</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm animate-shake">
                                {error}
                            </div>
                        )}

                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Email"
                            className="w-full px-3 py-3 border rounded-md"
                        />

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Password"
                                className="w-full px-3 py-3 pr-10 border rounded-md"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 text-white rounded-md transition-colors"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>

                        <p className="text-center text-sm">
                            Don't have an account?{" "}
                            <Link to="/register" className="text-blue-600">
                                Sign up
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../../assets/images/lccb_logo.png";
import auditrackLogo from "../../assets/images/logo.png";
import bg from "../../assets/images/homebg.jpg";
import { usersAPI } from "../../utils/api";

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // 🔒 Redirect if already logged in
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            navigate("/home", { replace: true });
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

                navigate("/home", { replace: true });
            } else {
                setError(response.message || "Login failed");
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
            {/* Left side - Login form */}
            <div className="w-1/2 flex items-center justify-center bg-white">
                <div className="w-full max-w-md px-8">
                    <div className="text-center mb-8">
                        <img src={logo} alt="Logo" className="w-16 h-16 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                        <p className="text-gray-600">Please enter your details</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
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

                        <input
                            type="password"
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Password"
                            className="w-full px-3 py-3 border rounded-md"
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 text-white rounded-md"
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

            {/* Right side */}
            <div
                className="w-1/2 bg-cover bg-center"
                style={{ backgroundImage: `url(${bg})` }}
            >
                <div className="flex items-center justify-center h-full bg-blue-600 bg-opacity-20">
                    <div className="text-white text-center">
                        <img src={auditrackLogo} className="w-32 mx-auto mb-4" />
                        <h2 className="text-4xl font-bold">Auditrack</h2>
                        <p className="mt-2">
                            Streamline your compliance processes
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

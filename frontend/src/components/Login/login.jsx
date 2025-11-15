import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/images/lccb_logo.png"
import bg from "../../assets/images/login_bg.jpg"
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
            const response = await axios.post("http://localhost:3000/user/login", {
                email: formData.email,
                password: formData.password
            });

            if (response.data.success) {
                // Store user data in localStorage or context
                localStorage.setItem("user", JSON.stringify(response.data.user));
                
                // Redirect to home page
                navigate("/home");
            } else {
                setError(response.data.message || "Login failed");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Invalid email or password");
            console.error("Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative flex justify-center items-center h-screen bg-cover bg-center"
            style={{ backgroundImage: `url(${bg})`}}
        >
            <div className="absolute inset-0 bg-black/50"></div>

            <div className="relative z-10 w-auto">
                <div className="bg-white rounded-xl shadow-lg px-8 py-8 flex items-center justify-center gap-4 mb-6 border-2 border-slate-400">
                    <img
                        src={logo}
                        alt="App Logo"
                        className="w-16 h-16"
                    />
                    <h1 className="text-2xl font-bold text-gray-900">
                        Compliance and Audit
                    </h1>
                </div>

                <form 
                    className="bg-white p-8 rounded shadow-md w-96 border-2 border-slate-400"
                    onSubmit={handleSubmit}
                >
                    <h1 className="text-center text-2xl font-bold mb-6">Login</h1>

                    {error && (
                        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    <div className="mb-4">
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full p-2 border-2 border-slate-300 rounded"
                        />
                    </div>
                    <div className="mb-6">
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full p-2 border-2 border-slate-300 rounded"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2 rounded transition-colors ${
                            loading 
                                ? "bg-blue-300 cursor-not-allowed" 
                                : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                    >
                        {loading ? "Processing..." : "Login"}
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


import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: "",
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
            // Combine first and last name for fullName as required by the database
            const fullName = `${formData.firstName} ${formData.lastName}`;
            
            // Send registration data to backend API (backend mounts user routes at /user)
            const response = await axios.post("http://localhost:3000/user/register", {
                fullName,
                email: formData.email,
                password: formData.password,
                roleId: parseInt(formData.roleId)
            });

            if (response.data.success) {
                // Redirect to login page on success (login component is mounted at '/')
                navigate("/");
            } else {
                setError(response.data.message || "Registration failed");
            }
        } catch (err) {
            setError(err.response?.data?.message || "An error occurred during registration");
            console.error("Registration error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative flex justify-center items-center h-screen bg-cover bg-center"
            style={{ backgroundImage: "url('/images/login_bg.jpg')" }}
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

                <form 
                    className="bg-white p-8 rounded shadow-md w-96 border-2 border-slate-400"
                    onSubmit={handleSubmit}
                >
                    <h1 className="text-center text-2xl font-bold mb-6">Register</h1>
                    
                    {error && (
                        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    <div className="mb-4">
                        <input
                            type="text"
                            name="firstName"
                            placeholder="First Name"
                            required
                            value={formData.firstName}
                            onChange={handleChange}
                            className="w-full p-2 border-2 border-gray-300 rounded"
                        />
                    </div>
                    <div className="mb-4">
                        <input
                            type="text"
                            name="lastName"
                            placeholder="Last Name"
                            required
                            value={formData.lastName}
                            onChange={handleChange}
                            className="w-full p-2 border-2 border-gray-300 rounded"
                        />
                    </div>
                    <div className="mb-4">
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full p-2 border-2 border-gray-300 rounded"
                        />
                    </div>
                    <div className="mb-4">
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full p-2 border-2 border-gray-300 rounded"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Select Role
                        </label>
                        <select
                            name="roleId"
                            value={formData.roleId}
                            onChange={handleChange}
                            className="w-full p-2 border-2 border-gray-300 rounded"
                            required
                        >
                            <option value="2">User</option>
                            <option value="1">Admin</option>
                        </select>
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
                        {loading ? "Processing..." : "Register"}
                    </button>
                    <div className="mt-4 text-center">
                        <p className="text-sm">
                            Already have an account? <a href="/login" className="text-blue-500 hover:underline">Login</a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

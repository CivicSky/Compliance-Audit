import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import bg from "../assets/images/bglogins.jpg";
import logo from "../assets/images/lccb_logo.png";
import auditrackLogo from "../assets/images/logo.png";

export default function RegisterAuditor() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get("invite") || "";
    const [formData, setFormData] = useState({
        firstName: "",
        middleInitial: "",
        lastName: "",
        email: "",
        password: "",
        roleId: "4" // Fixed to Auditor role (4) in database
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });

        if (name === 'password') {
            validatePassword(value);
        }

        if (name === 'email') {
            validateEmail(value);
        }
    };

    const validateEmail = (email) => {
        const normalizedEmail = email.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {
            setEmailError("Please enter a valid email address");
            return false;
        }

        setEmailError("");
        return true;
    };

    const validatePassword = (password) => {
        const numberCount = (password.match(/\d/g) || []).length;
        
        if (password.length < 8) {
            setPasswordError("Password must be at least 8 characters long");
            return false;
        } else if (numberCount < 3) {
            setPasswordError("Password must contain at least 3 numbers");
            return false;
        } else {
            setPasswordError("");
            return true;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!validateEmail(formData.email)) {
            setLoading(false);
            setError("Please enter a valid email address");
            return;
        }

        if (!validatePassword(formData.password)) {
            setLoading(false);
            setError("Please fix the password requirements before submitting");
            return;
        }

        try {
            navigate("/otp", {
                state: {
                    firstName: formData.firstName,
                    middleInitial: formData.middleInitial,
                    lastName: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                    roleId: 4,
                    inviteToken: inviteToken || undefined,
                },
            });
        } catch (err) {
            console.error('Auditor registration error:', err);
            setError(err.response?.data?.message || "An error occurred during auditor registration");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left side - Background Image */}
            <div 
                className="w-1/2 flex items-center justify-center relative overflow-hidden transition-all duration-700 ease-in-out bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url(${bg})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover'
                }}
            >
                <div className="absolute inset-0 bg-blue-900 bg-opacity-65"></div>

                <div className="relative z-10 text-center text-white max-w-md animate-fade-in-left">
                    <div className="mb-6">
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
                        External Auditor Registration Portal for Accreditation & Compliance Evaluation.
                    </p>
                </div>
            </div>

            {/* Right side - Registration form */}
            <div className="w-1/2 flex items-center justify-center bg-white transition-all duration-700 ease-in-out transform">
                <div className="w-full max-w-md px-8 animate-fade-in-right">
                    <div className="text-center mb-8 animate-slide-down">
                        <img
                            src={logo}
                            alt="App Logo"
                            className="w-16 h-16 mx-auto mb-4 transition-transform duration-500 hover:scale-110"
                        />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2 transition-all duration-300">
                            Auditor Sign Up
                        </h1>
                        <p className="text-gray-600 transition-opacity duration-500">Create an External Auditor account</p>
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
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                                    emailError
                                        ? 'border-red-300 focus:ring-red-500'
                                        : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                                }`}
                                placeholder="auditor@organization.org or email"
                            />
                            <p className={`mt-1 text-xs ${emailError ? 'text-red-600' : 'text-gray-500'}`}>
                                {emailError || "Enter any valid email address (no domain restriction)"}
                            </p>
                        </div>

                        <input type="hidden" name="roleId" value="4" />
                        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700 font-semibold flex items-center gap-1.5">
                            <span>🛡️ Role is set to Auditor (Role ID 4).</span>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm pr-10 ${
                                        passwordError
                                            ? 'border-red-300 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                                    }`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4 text-gray-500" />
                                    ) : (
                                        <Eye className="w-4 h-4 text-gray-500" />
                                    )}
                                </button>
                            </div>
                            <p className={`mt-1 text-xs ${passwordError ? 'text-red-600' : 'text-gray-500'}`}>
                                {passwordError || "Must be at least 8 characters long and contain at least 3 numbers."}
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 font-medium text-sm disabled:opacity-50"
                        >
                            {loading ? "Sending OTP..." : "Sign Up as Auditor"}
                        </button>

                        <div className="text-center mt-4">
                            <span className="text-sm text-gray-600">Already have an account? </span>
                            <Link to="/login" className="text-sm text-blue-600 hover:underline font-medium">
                                Sign in
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

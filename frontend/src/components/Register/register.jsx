import { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import bg from "../../assets/images/bglogins.jpg"
import logo from "../../assets/images/lccb_logo.png"
import auditrackLogo from "../../assets/images/logo.png"
import { usersAPI } from "../../utils/api";
import { useModal } from "../UI/ModalProvider";

const COMPANY_EMAIL_DOMAIN = "@lccbonline.edu.ph";

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showAlert } = useModal();
    const inviteToken = new URLSearchParams(location.search).get("invite") || "";
    const inviteExpiredRef = useRef(false);
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
    const [inviteChecking, setInviteChecking] = useState(Boolean(inviteToken));
    const [inviteInfo, setInviteInfo] = useState(null);
    const [passwordError, setPasswordError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!inviteToken) return;

        let timerId;
        let cancelled = false;

        const handleExpiredInvite = async () => {
            if (inviteExpiredRef.current) return;
            inviteExpiredRef.current = true;
            await showAlert("Invite expired.", "Invite Expired");
            navigate("/login", { replace: true });
        };

        const validateInvite = async () => {
            setInviteChecking(true);
            try {
                const response = await usersAPI.validateRegistrationInvite(inviteToken);
                if (cancelled) return;

                const invite = response.invite;
                setInviteInfo(invite);
                setFormData((current) => ({
                    ...current,
                    email: invite?.email || current.email,
                    roleId: String(invite?.roleId || current.roleId || "2"),
                }));

                const remainingMs = Math.max(0, Number(invite?.expiresAt || 0) - Date.now());
                timerId = window.setTimeout(handleExpiredInvite, remainingMs);
            } catch {
                if (cancelled) return;
                await handleExpiredInvite();
            } finally {
                if (!cancelled) setInviteChecking(false);
            }
        };

        validateInvite();

        return () => {
            cancelled = true;
            if (timerId) window.clearTimeout(timerId);
        };
    }, [inviteToken, navigate, showAlert]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });

        // Validate password on change
        if (name === 'password') {
            validatePassword(value);
        }

        if (name === 'email') {
            validateEmail(value);
        }
    };

    const validateEmail = (email) => {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail.endsWith(COMPANY_EMAIL_DOMAIN)) {
            setEmailError(`Email must use the ${COMPANY_EMAIL_DOMAIN} domain`);
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
            setError(`Only ${COMPANY_EMAIL_DOMAIN} email addresses can register`);
            return;
        }

        // Validate password before submitting
        if (!validatePassword(formData.password)) {
            setLoading(false);
            setError("Please fix the password errors before submitting");
            return;
        }

        try {
            console.log('Submitting registration with data:', {
                firstName: formData.firstName,
                middleInitial: formData.middleInitial,
                lastName: formData.lastName,
                email: formData.email,
                roleId: parseInt(formData.roleId)
            });

            navigate("/otp", {
                state: {
                    firstName: formData.firstName,
                    middleInitial: formData.middleInitial,
                    lastName: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                    roleId: parseInt(inviteInfo?.roleId || formData.roleId, 10) || 2,
                    inviteToken: inviteToken || null,
                },
            });
        } catch (err) {
            console.error('Registration error full:', err);
            console.error('Error response:', err.response);
            setError(err.response?.data?.message || "An error occurred during registration");
        } finally {
            setLoading(false);
        }
    };

    if (inviteChecking) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <img src={logo} alt="App Logo" className="mx-auto mb-4 h-16 w-16" />
                    <p className="text-sm font-medium text-gray-700">Checking invite link...</p>
                </div>
            </div>
        );
    }

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
                <div className="absolute inset-0 bg-blue-800 bg-opacity-60"></div>

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
            <div className="w-1/2 flex items-center justify-center bg-slate-50 transition-all duration-700 ease-in-out transform">
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
                                disabled={Boolean(inviteInfo?.email)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                                    emailError
                                        ? 'border-red-300 focus:ring-red-500'
                                        : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                                }`}
                                placeholder={`name${COMPANY_EMAIL_DOMAIN}`}
                            />
                            <p className={`mt-1 text-xs ${emailError ? 'text-red-600' : 'text-gray-500'}`}>
                                {emailError || `Use your ${COMPANY_EMAIL_DOMAIN} email address`}
                            </p>
                        </div>

                        {inviteInfo && (
                            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                Invite verified. This link expires 10 minutes after it was created.
                            </div>
                        )}

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
                                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                                        passwordError 
                                            ? 'border-red-300 focus:ring-red-500' 
                                            : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                                    }`}
                                    placeholder="Create a password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            <div className="mt-1 text-xs space-y-1">
                                <p className={`${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                                    • At least 8 characters
                                </p>
                                <p className={`${(formData.password.match(/\d/g) || []).length >= 3 ? 'text-green-600' : 'text-gray-500'}`}>
                                    • At least 3 numbers
                                </p>
                            </div>
                            {passwordError && (
                                <p className="mt-1 text-xs text-red-600">{passwordError}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || passwordError || emailError}
                            className={`w-full py-2 px-4 rounded-md font-medium transition-colors text-sm ${
                                loading || passwordError || emailError
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

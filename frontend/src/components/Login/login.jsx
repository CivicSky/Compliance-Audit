import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import logo from "../../assets/images/lccb_logo.png";
import auditrackLogo from "../../assets/images/logo.png";
import bg from "../../assets/images/bglogins.jpg";
import { usersAPI } from "../../utils/api";
import { useModal } from "../UI/ModalProvider";

export default function Login() {
    const navigate = useNavigate();
    const { showAlert } = useModal();
    const location = useLocation();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [blockedMs, setBlockedMs] = useState(0);
    const [blockedUntil, setBlockedUntil] = useState(null);

    // restore blocked state from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('loginBlockedUntil');
            if (stored) {
                const until = Number(stored);
                if (!Number.isNaN(until) && until > Date.now()) {
                    setBlockedUntil(until);
                    setBlockedMs(Math.max(0, until - Date.now()));
                } else {
                    localStorage.removeItem('loginBlockedUntil');
                }
            }
        } catch (e) {
            // ignore storage errors
        }
    }, []);

    // Server-side pre-check: query login-status when the email changes (debounced)
    useEffect(() => {
        let id;
        const runCheck = async () => {
            try {
                const email = String(formData.email || '').trim();
                if (!email) return;
                const resp = await usersAPI.loginStatus(email);
                const remaining = resp?.remainingMs || 0;
                if (remaining > 0) {
                    const until = Date.now() + remaining;
                    setBlockedMs(remaining);
                    setBlockedUntil(until);
                    try { localStorage.setItem('loginBlockedUntil', String(until)); } catch(e) {}
                    setError(resp?.message || `Too many failed login attempts. Please wait.`);
                } else {
                    // clear any persisted block if server says no block
                    setBlockedMs(0);
                    setBlockedUntil(null);
                    try { localStorage.removeItem('loginBlockedUntil'); } catch(e) {}
                    setError("");
                }
            } catch (err) {
                // network errors are non-fatal for UX; keep existing state
            }
        };

        // debounce calls while user types
        id = setTimeout(runCheck, 400);
        return () => clearTimeout(id);
    }, [formData.email]);

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

    // Show message from previous navigation (e.g., OTP verified)
    useEffect(() => {
        const msg = location.state?.message;
        if (msg) {
            setError(msg);
            // show popup using modal provider
            try { showAlert(msg); } catch (e) {}
            // clear location state so message doesn't persist
            navigate(location.pathname, { replace: true, state: null });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (blockedMs && blockedMs > 0) return; // prevent submitting while blocked
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

                // clear any persisted block on successful login
                try { localStorage.removeItem('loginBlockedUntil'); } catch (e) {}

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
                    await showAlert("Your account is still pending approval. Please wait for the administrator to review your account.");
                } else if (response.approvalStatus === 'denied') {
                    setError("Your account has been denied access.");
                    await showAlert("Your account has been denied access. Please contact the administrator for more information.");
                } else {
                    setError(response.message || "Login failed");
                }
            }
        } catch (err) {
            const resp = err.response;
            if (resp && resp.status === 429) {
                const remaining = resp.data?.remainingMs || 0;
                const until = Date.now() + remaining;
                setBlockedMs(remaining);
                setBlockedUntil(until);
                try { localStorage.setItem('loginBlockedUntil', String(until)); } catch(e) {}
                setError(resp.data?.message || 'Too many failed login attempts.');
            } else {
                setError(
                    resp?.data?.message ||
                    "Invalid email or password"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    // Countdown for blocked state
    useEffect(() => {
        if (!blockedUntil) return;
        const tick = () => {
            const ms = Math.max(0, blockedUntil - Date.now());
            setBlockedMs(ms);
            if (ms <= 0) {
                    setBlockedUntil(null);
                    setBlockedMs(0);
                    try { localStorage.removeItem('loginBlockedUntil'); } catch(e) {}
                    setError("");
                }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [blockedUntil]);

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Left side - Background */}
            <div
                className="w-1/2 bg-cover bg-center transition-all duration-700 ease-in-out"
                style={{ backgroundImage: `url(${bg})` }}
            >
                <div className="flex items-center justify-center h-full" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.75) 0%, rgba(29,78,216,0.70) 100%)' }}>
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
                        {/* Show either blocked countdown OR the error message (not both) */}
                        {blockedMs > 0 ? (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm">
                                {/* format as M:SS */}
                                {(() => {
                                    const total = Math.ceil(blockedMs / 1000);
                                    const m = Math.floor(total / 60);
                                    const s = total % 60;
                                    return `Too many failed login attempts. Please wait ${m}:${String(s).padStart(2, '0')} before retrying.`;
                                })()}
                            </div>
                        ) : (
                            error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm animate-shake">
                                    {error}
                                </div>
                            )
                        )}

                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Email"
                            className="w-full px-3 py-3 border border-blue-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-blue-50/30"
                            disabled={blockedMs > 0}
                        />

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Password"
                                className="w-full px-3 py-3 pr-10 border border-blue-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-blue-50/30"
                                disabled={blockedMs > 0}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={blockedMs > 0}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
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
                            disabled={loading || blockedMs > 0}
                            className="w-full py-3 text-white font-semibold rounded-md transition-all duration-200 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ background: loading || blockedMs > 0 ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: loading || blockedMs > 0 ? 'none' : '0 4px 14px rgba(37,99,235,0.35)' }}
                        >
                            {loading ? "Signing in..." : blockedMs > 0 ? `Locked (${Math.ceil(blockedMs/1000)}s)` : "Sign in"}
                        </button>

                        <div className="flex flex-col items-center gap-1.5 text-xs text-slate-600">
                            <div>
                                Don't have an account?{" "}
                                <Link to="/register" className="text-blue-600 font-semibold hover:underline">
                                    Sign up
                                </Link>
                            </div>
                            <div>
                                External Auditor?{" "}
                                <Link to="/register-auditor" className="text-sky-600 font-semibold hover:underline">
                                    Sign up as Auditor
                                </Link>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

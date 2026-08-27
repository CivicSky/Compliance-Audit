import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import bg from "../assets/images/bglogins.jpg";
import logo from "../assets/images/lccb_logo.png";
import auditrackLogo from "../assets/images/logo.png";
import { API_BASE_URL } from '../utils/apiBase';

export default function Otp() {
    const navigate = useNavigate();
    const location = useLocation();
    const registrationData = location.state || {};
    const email = registrationData.email || "";
    const [otp, setOtp] = useState("");
    const [message, setMessage] = useState("Enter the one-time PIN sent to your email.");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const didSendRef = useRef(false);

    const sendOtp = async () => {
        if (!email) {
            setError("Registration email is missing. Please go back and register again.");
            return;
        }

        setSending(true);
        setError("");

        try {
            const response = await axios.post(`${API_BASE_URL}/api/user/send-registration-otp`, {
                ...registrationData,
                email,
            });

            setMessage(response.data.message || "We sent a one-time PIN to your email.");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send one-time PIN.");
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        if (!email || didSendRef.current) return;
        didSendRef.current = true;
        sendOtp();
    }, [email]);

    const handleVerify = async (e) => {
        e.preventDefault();

        if (!email) {
            setError("Registration email is missing. Please go back and register again.");
            return;
        }

        if (otp.length !== 6) {
            setError("Enter the 6-digit one-time PIN.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await axios.post(`${API_BASE_URL}/api/user/verify-registration-otp`, {
                email,
                otp,
            });

            if (response.data.success) {
                navigate("/login", {
                    replace: true,
                    state: {
                        message: response.data.message || "Email verified. Your account is pending approval.",
                    },
                });
                return;
            }

            setError(response.data.message || "Wrong one-time PIN. Please try again.");
        } catch (err) {
            setError(err.response?.data?.message || "Wrong one-time PIN. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full overflow-hidden">
            <div
                className="w-1/2 flex items-center justify-center relative overflow-hidden bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${bg})` }}
            >
                <div className="absolute inset-0 bg-blue-800 bg-opacity-60"></div>
                <div className="relative z-10 text-center text-white max-w-md animate-fade-in-left">
                    <img
                        src={auditrackLogo}
                        alt="Auditrack Logo"
                        className="w-32 h-32 object-contain mx-auto mb-4 drop-shadow-2xl"
                    />
                    <h2 className="text-4xl font-bold mb-4 drop-shadow-lg">Auditrack</h2>
                    <p className="text-white text-lg drop-shadow-md px-4">
                        Verify your email before we create your account.
                    </p>
                </div>
            </div>

            <div className="w-1/2 flex items-center justify-center bg-white">
                <div className="w-full max-w-md px-8 animate-fade-in-right">
                    <div className="text-center mb-8">
                        <img src={logo} alt="App Logo" className="w-16 h-16 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify OTP</h1>
                        <p className="text-gray-600">
                            {email ? `Enter the code sent to ${email}` : "Please register first to receive a one-time PIN"}
                        </p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-4">
                        {message && (
                            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm animate-shake">
                                {error}
                            </div>
                        )}

                        <input
                            type="text"
                            inputMode="numeric"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                            placeholder="000000"
                            disabled={!email || loading}
                        />

                        <button
                            type="submit"
                            disabled={!email || loading || otp.length !== 6}
                            className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                                !email || loading || otp.length !== 6
                                    ? "bg-blue-300 cursor-not-allowed text-white"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                        >
                            {loading ? "Verifying..." : "Verify OTP"}
                        </button>

                        <button
                            type="button"
                            onClick={sendOtp}
                            disabled={!email || sending}
                            className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-500 disabled:text-gray-400"
                        >
                            {sending ? "Sending..." : "Resend OTP"}
                        </button>

                        <p className="text-center text-sm text-gray-600">
                            Wrong email?{" "}
                            <Link to="/register" className="text-blue-600 hover:text-blue-500 font-medium">
                                Register again
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

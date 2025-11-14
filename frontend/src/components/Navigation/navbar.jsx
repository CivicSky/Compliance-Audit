import { Link } from "react-router-dom";

export default function Navbar() {
    return (
        <nav className="fixed top-4 left-4 h-[90vh] w-60 bg-slate-800 rounded-xl shadow-xl flex flex-col justify-between p-4">
            <div className="flex flex-col space-y-5">
                <Link to="/home" className="mb-6 block">
                    <span className="font-semibold text-white text-white-800">
                        Compliance and Audit
                    </span>
                </Link>

                <Link
                    to="/home/organizations"
                    className="py-2 px-3 text-lg font-light text-white hover:text-sky-300 rounded-lg hover:bg-slate-700 transition duration-300"
                >
                    Organizations
                </Link>

                <Link
                    to="/home/audit"
                    className="py-1 px-3 text-lg font-light text-white hover:text-sky-300 rounded-lg hover:bg-slate-700 transition duration-300"
                >
                    Audits
                </Link>

                <Link
                    to="/requirments"
                    className="py-1 px-3 text-lg font-light text-white hover:text-sky-300 rounded-lg hover:bg-slate-700 transition duration-300"
                >
                    Requirements
                </Link>

                <Link
                    to="/profile"
                    className="py-1 px-3 text-lg font-light text-white hover:text-sky-300 rounded-lg hover:bg-slate-700 transition duration-300"
                >
                    Profile
                </Link>
            </div>
            <div>
                <Link
                    to="/"
                    className="py-2 px-3 text-lg font-medium text-red-400 hover:text-red-600 hover:bg-slate-700 rounded-lg transition duration-300"
                >
                    Sign out
                </Link>
            </div>




        </nav>
    );
};


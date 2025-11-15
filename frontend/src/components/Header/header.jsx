import logo from "../../assets/images/lccb_logo.png"
import search from "../../assets/images/search.svg"

export default function Header({ pageTitle = "Compliance Audit" }) {
    return (
        <div className="fixed top-0 left-64 right-0 z-40 bg-white shadow-lg px-6 py-4">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                    <img
                        src={logo}
                        alt="Logo"
                        className="h-16 w-16 object-contain"
                    />
                    <h1 className="text-3xl font-bold text-gray-800">
                        {pageTitle}
                    </h1>
                </div>
                
                <div className="relative w-80">
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full px-4 py-2 pr-10 rounded-xl bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 border-0 shadow-inner"
                    />
                    <img
                        src={search}
                        alt="Search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"
                    />
                </div>
            </div>
        </div>
    );
}


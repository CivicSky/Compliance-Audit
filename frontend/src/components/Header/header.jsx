import logo from "../../assets/images/lccb_logo.png"
import search from "../../assets/images/search.svg"

export default function Header({ pageTitle = "Compliance Audit", showSearch = true }) {
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

                {showSearch && (
                    <div className="flex items-center gap-4">
                        <div className="relative w-80">
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-full px-4 py-2 pr-10 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 border-0 shadow-inner"
                            />
                            <img
                                src={search}
                                alt="Search"
                                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none"
                            />
                        </div>
                        
                        {/* Toolbar buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-50 rounded-md text-gray-700 shadow-md border border-gray-200"
                                title="Sort"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-50 rounded-md text-green-600 shadow-md border border-gray-200"
                                title="Add"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-50 rounded-md text-red-600 shadow-md border border-gray-200"
                                title="Remove"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


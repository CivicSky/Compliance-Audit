import react from "react";
import { useState } from "react";

const Header = () =>{
    return(
        <div className="relative z-10 -mt-6">
            <div className="relative z-10 -mt-6">
                <div className="bg-white shadow-xl rounded-2xl p-6 flex items-center justify-center gap-4 border-2 border-slate-400">
                    <img src="/images/lccb_logo.png"
                         alt="Logo"
                         className="h-20 w-30 object-contain mr-10"/>
                    <h1 className="text-4xl font-bold text-gray-800">
                        Compliance Audity
                    </h1>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <div className="relative w-1/3">
                    <input
                    type="text"
                    placeholder="Search"
                    className="w-full px-4 py-2 pr-10 rounded-xl border-2 border-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <img
                    src="/images/search.svg"
                    alt="Search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-5  text-gray-500 pointer-events-none"
                    />
                </div>
            </div>
        </div>
    );
};

export default Header;


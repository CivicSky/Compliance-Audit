import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../Header/header";

const Home = ()=>{
    return(
        <div className="ml-72 px-6 pb-6 pt-0 "> 

            <Header/>
        
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
                    <div className="relative bg-white shadow-md rounded-2xl p-6 text-center hover:scale-105 transition-transform overflow-hidden">
                        <img 
                            src="/images/organization.svg"
                            alt="background"
                            className="absolute top-2 right-2 w-20 h-35 opacity-15"
                        />
                        <h2 className="text-lg font-semibold text-gray-700">Organizations</h2>
                        <p className="text-3xl font-bold text-blue-600 mt-2">12</p>
                    </div>
                    <div className="relative bg-white shadow-md rounded-2xl p-6 text-center hover:scale-105 transition-transform overflow-hidden">
                        <img 
                            src="/images/user.svg"
                            alt="background"
                            className="absolute top-2 right-2 w-20 h-35 opacity-15"
                        />
                        <h2 className="text-lg font-semibold text-gray-700">User</h2>
                        <p className="text-3xl font-bold text-blue-600 mt-2">245</p>
                    </div>
                    <div className="relative bg-white shadow-md rounded-2xl p-6 text-center hover:scale-105 transition-transform overflow-hidden">
                        <img 
                            src="/images/audit.svg"
                            alt="background"
                            className="absolute top-2 right-2 w-20 h-35 opacity-15"
                        />
                        <h2 className="text-lg font-semibold text-gray-700">Total Audits</h2>
                        <p className="text-3xl font-bold text-blue-600 mt-2">58</p>
                    </div>
                    <div className="relative bg-white shadow-md rounded-2xl p-6 text-center hover:scale-105 transition-transform overflow-hidden">
                        <img 
                            src="/images/pending.svg"
                            alt="background"
                            className="absolute top-2 right-2 w-20 h-35 opacity-15"
                        />
                        <h2 className="text-lg font-semibold text-gray-700">Pending Audits</h2>
                        <p className="text-3xl font-bold text-blue-600 mt-2">7</p>
                    </div>
                </div>
            </div>
       
    );
};



export default Home;
import React, { useState } from "react";
import Header from "../../components/Header/header.jsx";
import user from "../../assets/images/user.svg"

export default function Organization() {


    return (
        <div className="ml-72 px-6 pb-6 pt-0">
            <Header />
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 justify-center">
                <div class="bg-white shadow-md rounded-2xl p-5 w-full max-w-sm hover:shadow-lg transition border-2 border-slate-400">
                    <div class="flex justify-between items-start">
                        <h3 class="text-lg font-semibold text-gray-800">SBIT DEPARTMENT</h3>
                        <span class="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded-full">
                            Complied
                        </span>
                    </div>
                    <div class="flex items-center border-t border-gray-200 mt-4 pt-3">
                        <img
                            src={user}
                            alt="Sarah Johnson"
                            class="w-10 h-10 rounded-full mr-3 object-cover"
                        />
                        <div>
                            <p class="text-sm font-semibold text-gray-800">Lenuelito Betita</p>
                            <p class="text-xs text-gray-500">Program Head</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white shadow-md rounded-2xl p-5 w-full max-w-sm hover:shadow-lg transition border-2 border-slate-400">
                    <div class="flex justify-between items-start">
                        <h3 class="text-lg font-semibold text-gray-800">SSLATE</h3>
                        <span class="px-3 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">
                            Not Complied
                        </span>
                    </div>
                    <div class="flex items-center border-t border-gray-200 mt-4 pt-3">
                        <img
                            src={user}
                            alt="Sarah Johnson"
                            class="w-10 h-10 rounded-full mr-3 object-cover"
                        />
                        <div>
                            <p class="text-sm font-semibold text-gray-800">Lenuelito Betita</p>
                            <p class="text-xs text-gray-500">Program Head</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white shadow-md rounded-2xl p-5 w-full max-w-sm hover:shadow-lg transition border-2 border-slate-400">
                    <div class="flex justify-between items-start">
                        <h3 class="text-lg font-semibold text-gray-800">MIS Office</h3>
                        <span class="px-3 py-1 text-xs font-semibold text-white bg-orange-500 rounded-full">
                            Partially Complied
                        </span>
                    </div>
                    <div class="flex items-center border-t border-gray-200 mt-4 pt-3">
                        <img
                            src={user}
                            alt="Sarah Johnson"
                            class="w-10 h-10 rounded-full mr-3 object-cover"
                        />
                        <div>
                            <p class="text-sm font-semibold text-gray-800">Lenuelito Betita</p>
                            <p class="text-xs text-gray-500">Program Head</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

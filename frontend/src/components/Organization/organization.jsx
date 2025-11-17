import { useState } from "react";
import Header from "../../components/Header/header.jsx";
import user from "../../assets/images/user.svg";
import { Link } from "react-router-dom";

// Simple modal component
const OfficeModal = ({ isOpen, onClose, office }) => {
    if (!isOpen || !office) return null;

    const {
        name,
        headName,
        headPosition,
        status,
        needsToComply,
        progress,
    } = office;

    const isComplied = status.toLowerCase() === "complied";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative">

                {/* Header + progress bar */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-lg font-bold" style={{ color: "#121212" }}>
                            {name}
                        </h2>
                        <div className="mt-1 flex items-center gap-2">
                            <span
                                className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${isComplied
                                        ? "bg-green-500"
                                        : status.toLowerCase() === "not complied"
                                            ? "bg-red-500"
                                            : "bg-orange-500"
                                    }`}
                            >
                                {status}
                            </span>
                        </div>
                    </div>

                    {/* Progress bar (upper right) */}
                    <div className="w-32">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${isComplied ? "bg-green-500" : "bg-blue-500"
                                    }`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 my-3" />

                {/* Head of office */}
                <div className="flex items-center mb-4">
                    <img
                        src={user}
                        alt={headName}
                        className="w-10 h-10 rounded-full mr-3 object-cover"
                    />
                    <div>
                        <p className="text-sm font-semibold" style={{ color: "#121212" }}>
                            {headName}
                        </p>
                        <p className="text-xs text-gray-500">{headPosition}</p>
                    </div>
                </div>

                {/* What to comply */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-1">
                        Requirements / To Comply:
                    </p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                        {needsToComply}
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function Organization() {
    const [selectedOffice, setSelectedOffice] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);


    const offices = [
        {
            id: 1,
            name: "SBIT DEPARTMENT",
            status: "Complied",
            headName: "Lenuelito Betita",
            headPosition: "Program Head",
            needsToComply: "All documents have been submitted and verified.\nNo pending requirements.",
            progress: 100,
            badgeColor: "bg-green-500",
        },
        {
            id: 2,
            name: "SSLATE",
            status: "Not Complied",
            headName: "Lenuelito Betita",
            headPosition: "Program Head",
            needsToComply:
                "- Submit SEM 1 accomplishment report\n- Upload updated office inventory\n- Provide signed acknowledgment form.",
            progress: 20,
            badgeColor: "bg-red-500",
        },
        {
            id: 3,
            name: "MIS OFFICE",
            status: "Partially Complied",
            headName: "Lenuelito Betita",
            headPosition: "Program Head",
            needsToComply:
                "- Lacks updated system backup logs\n- Pending approval on risk assessment form.",
            progress: 60,
            badgeColor: "bg-orange-500",
        },
        {
            id: 4,
            name: "Arfien",
            status: "Partially Complied",
            headName: "Lenuelito Betita",
            headPosition: "Program Head",
            needsToComply:
                "- Submit final network diagram\n- Complete documentation for recent changes.",
            progress: 55,
            badgeColor: "bg-orange-500",
        },
    ];

    const handleCardClick = (office) => {
        setSelectedOffice(office);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedOffice(null);
    };

    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header pageTitle="Offices" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {offices.map((office) => (
                    <div
                        key={office.id}
                        onClick={() => handleCardClick(office)}
                        className="bg-white rounded-md p-4 w-full shadow-md hover:shadow-lg hover:bg-gray-50 transform transition-all duration-300 border border-gray-200 cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                            <h3
                                className="text-base font-semibold"
                                style={{ color: "#121212" }}
                            >
                                {office.name}
                            </h3>
                            <span
                                className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${office.badgeColor}`}
                            >
                                {office.status}
                            </span>
                        </div>
                        <div className="flex items-center border-t border-gray-200 mt-3 pt-2">
                            <img
                                src={user}
                                alt={office.headName}
                                className="w-8 h-8 rounded-full mr-3 object-cover"
                            />
                            <div>
                                <p
                                    className="text-sm font-semibold"
                                    style={{ color: "#121212" }}
                                >
                                    {office.headName}
                                </p>
                                <p className="text-xs text-gray-500">{office.headPosition}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            <OfficeModal
                isOpen={isModalOpen}
                onClose={closeModal}
                office={selectedOffice}
            />
        </div>
    );
}

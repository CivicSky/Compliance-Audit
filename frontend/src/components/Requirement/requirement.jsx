import Header from "../Header/header.jsx";
import { useState } from "react";

export default function Requirement() {

    const [requirements, setRequirements] = useState([
        { id: 1, name: "Board Resolution", complied: false },
        { id: 2, name: "Constitution and By-laws", complied: false },
        { id: 3, name: "List of Officers & Advisers", complied: false },
        { id: 4, name: "Profile of Officers", complied: false },
        { id: 5, name: "List of Members", complied: false },
        { id: 6, name: "Financial Report", complied: false },
        { id: 7, name: "Calendar of Activities", complied: false },
        { id: 8, name: "Activity Report", complied: false },
        { id: 9, name: "Accreditation Form", complied: false },
        { id: 10, name: "Organizational Chart", complied: false },
        { id: 11, name: "Copy of Constitution / By-Laws (Updated)", complied: false },
        { id: 12, name: "Minutes of Meetings", complied: false },
        { id: 13, name: "Plan of Action", complied: false },
        { id: 14, name: "Official Email Address", complied: false },
        { id: 15, name: "Seminar Workshop Reports", complied: false },
        { id: 16, name: "General Assembly Documents", complied: false }
    ]);

    const toggleComplied = (id) => {
        setRequirements(prev =>
            prev.map(req =>
                req.id === id ? { ...req, complied: !req.complied } : req
            )
        );
    };


    const totalRequirements = requirements.length;
    const compliedCount = requirements.filter(req => req.complied).length;
    const compliedPercentage = Math.round((compliedCount / totalRequirements) * 100);

    return (
        <div className="ml-5 px-6 pb-6 pt-0">
            <Header />

            <div className="mt-6 bg-white p-6 shadow rounded">
                <h2 className="text-xl font-bold mb-4">
                    Requirements Checklist
                </h2>

                <div className="space-y-2">
                    {requirements.map(req => (
                        <label
                            key={req.id}
                            className="flex items-center gap-3 p-2 border-b"
                        >
                            <input
                                type="checkbox"
                                checked={req.complied}
                                onChange={() => toggleComplied(req.id)}
                            />
                            <span>{req.id}. {req.name}</span>
                        </label>
                    ))}
                </div>

                <div className="mt-4">
                    <h3 className="text-lg font-semibold">
                        Compliance Percentage:
                    </h3>
                    <p className="text-xl font-bold text-green-600">{compliedPercentage}%</p>
                </div>
            </div>
        </div>
    );
}

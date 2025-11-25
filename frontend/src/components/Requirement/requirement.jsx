import { useState } from "react";
import requirement from "../../assets/images/requirement.svg";
import Header from "../../components/Header/header";

export default function RequirementBars() {

    const [categories, setCategories] = useState([
        {
            id: 1,
            title: "PAASCU Accreditation",
            subtitle: "PAASCU",
            description: "Requirements for PAASCU Validation",
            logo: "/logos/paascu.png",
            open: false,
            pdf: "/mnt/data/PAASCU.pdf" // Add correct PAASCU file here
        },
        {
            id: 2,
            title: "PACUCOA Accreditation",
            subtitle: "PACUCOA",
            description: "Requirements for PACUCOA Validation",
            logo: "/logos/pacucoa.png",
            open: false,
            pdf: null // No file uploaded for PACUCOA yet
        },
        {
            id: 3,
            title: "ISO Certification",
            subtitle: "ISO",
            description: "Requirements for ISO Validation",
            logo: "/logos/iso.png",
            open: false,
            pdf: "/mnt/data/ISO 9001_2015 Quality Management Systems - Requirements.pdf"
        },
    ]);

    const toggleOpen = (id) => {
        setCategories((prev) =>
            prev.map((cat) =>
                cat.id === id ? { ...cat, open: !cat.open } : cat
            )
        );
    };

    return (
        <div className="p-6 flex flex-col gap-4">

            {/* Header */}
            <Header pageTitle="Requirements" />

            <div className="mt-6 space-y-4">
                {categories.map((cat) => (
                    <div
                        key={cat.id}
                        className="bg-white border rounded-xl shadow-sm hover:shadow-md transition p-4"
                    >
                        {/* Title Bar */}
                        <button
                            onClick={() => toggleOpen(cat.id)}
                            className="w-full px-3 py-2 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <img
                                    src={requirement}
                                    className="w-10 h-10 object-contain opacity-80"
                                />
                                <div>
                                    <h2 className="font-semibold text-lg">{cat.title}</h2>
                                    <p className="text-gray-600 text-sm">{cat.subtitle}</p>
                                    <p className="text-gray-500 text-xs -mt-1">{cat.description}</p>
                                </div>
                            </div>

                            <span className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-md">
                                {cat.open ? "Hide" : "View"}
                            </span>
                        </button>

                        {/* Collapsible PDF Viewer */}
                        {cat.open && (
                            <div className="px-8 py-4 bg-gray-50 border-t mt-2 rounded-b-lg">
                                
                              
                                {cat.pdf ? (
                                    <iframe
                                        src={cat.pdf}
                                        className="w-full h-[600px] border rounded-lg"
                                    />
                                ) : (
                                    <p className="text-gray-500 italic">
                                        No PDF file uploaded for this category.
                                    </p>
                                )}

                            </div>
                        )}

                    </div>
                ))}
            </div>
        </div>
    );
}

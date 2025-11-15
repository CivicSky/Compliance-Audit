import Header from "../Header/header.jsx";
import user from "../../assets/images/user.svg"

export default function OfficeP() {
    // Single profile data - will be replaced with backend data loop later
    const person = {
        id: 1,
        name: "Luciana A.",
        position: "English Teacher",
        office: "SBIT Department",
        rating: 4.3,
        profilePic: user
    };

    return (
        <div className="mt-4 max-w-6xl mx-auto px-2">
            <div className="bg-white rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                    {/* Left section - Profile pic, name and position */}
                    <div className="flex items-center gap-4">
                        <img
                            src={person.profilePic}
                            alt={person.name}
                            className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                            <h3 className="font-bold text-lg" style={{color: '#121212'}}>{person.name}</h3>
                            <p className="text-gray-600 text-sm">{person.position}</p>
                            {person.rating && (
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-yellow-500">⭐</span>
                                    <span className="text-sm text-gray-500">{person.rating}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vertical separator line */}
                    <div className="h-16 w-px bg-gray-300 mx-6"></div>

                    {/* Right section - Office */}
                    <div className="text-right">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {person.office}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
import Header from "../Header/header";
import user from "../../assets/images/user.svg"

export default function SBIT() {


    return (
        <div className="ml-72 px-6 pb-6 pt-0">
            <Header />
            <div className="bg-white shadow p-6 rounded-lg transition gap-8 mt-8 border-2 border-slate-400">

                <div className="flex items-center border-t border-gray-200 mt-4 pt-3">
                    <img
                        src={user}
                        alt="Program Head"
                        className="w-14 h-13 rounded-full mr-4 object-cover"
                    />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">Head: Lenuelito Betita</h2>
                        <p className="text-lg font-medium mt-2 mb-4">Program Head</p>
                    </div>
                </div>

                <div className="items-center border-t mt-4 pt-3">
                    <h2 className="text-2xl font-semibold mt-6">Requirements</h2>
                    <ul className=" text-lg list-disc ml-6 mt-2">
                        <li>Board Resolution</li>
                        <li>List of Members</li>
                        <li>Financial Report</li>
                        <li>Calendar of Activities</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

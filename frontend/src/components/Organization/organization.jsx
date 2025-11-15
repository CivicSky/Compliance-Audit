import Header from "../../components/Header/header.jsx";
import user from "../../assets/images/user.svg"

export default function Organization() {


    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header pageTitle="Offices"/>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                <div className="bg-white rounded-md p-5 w-full shadow-lg hover:shadow-none hover:bg-gray-100 transform transition-all duration-300 border-2 border-gray-200 stroke-2">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold" style={{color: '#121212'}}>SBIT DEPARTMENT</h3>
                        <span className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded-full">
                            Complied
                        </span>
                    </div>
                    <div className="flex items-center border-t border-gray-200 mt-4 pt-3">
                        <img
                            src={user}
                            alt="Sarah Johnson"
                            className="w-10 h-10 rounded-full mr-3 object-cover"
                        />
                        <div>
                            <p className="text-sm font-semibold" style={{color: '#121212'}}>Lenuelito Betita</p>
                            <p className="text-xs text-gray-500">Program Head</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-md p-5 w-full shadow-lg hover:shadow-none hover:bg-gray-100 transform transition-all duration-300 border-2 border-gray-200 stroke-2">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold" style={{color: '#121212'}}>SSLATE</h3>
                        <span className="px-3 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">
                            Not Complied
                        </span>
                    </div>
                    <div className="flex items-center border-t border-gray-200 mt-4 pt-3">
                        <img
                            src={user}
                            alt="Sarah Johnson"
                            className="w-10 h-10 rounded-full mr-3 object-cover"
                        />
                        <div>
                            <p className="text-sm font-semibold" style={{color: '#121212'}}>Lenuelito Betita</p>
                            <p className="text-xs text-gray-500">Program Head</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-md p-5 w-full shadow-lg hover:shadow-none hover:bg-gray-100 transform transition-all duration-300 border-2 border-gray-200 stroke-2">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold" style={{color: '#121212'}}>MIS Office</h3>
                        <span className="px-3 py-1 text-xs font-semibold text-white bg-orange-500 rounded-full">
                            Partially Complied
                        </span>
                    </div>
                    <div className="flex items-center border-t border-gray-200 mt-4 pt-3">
                        <img
                            src={user}
                            alt="Sarah Johnson"
                            className="w-10 h-10 rounded-full mr-3 object-cover"
                        />
                        <div>
                            <p className="text-sm font-semibold" style={{color: '#121212'}}>Lenuelito Betita</p>
                            <p className="text-xs text-gray-500">Program Head</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import Header from "../../components/Header/header.jsx";
import user from "../../assets/images/user.svg"

export default function Organization() {


    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header pageTitle="Offices"/>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <div className="bg-white rounded-md p-4 w-full shadow-md hover:shadow-lg hover:bg-gray-50 transform transition-all duration-300 border border-gray-200">
                    <div className="flex justify-between items-start">
                        <h3 className="text-base font-semibold" style={{color: '#121212'}}>SBIT DEPARTMENT</h3>
                        <span className="px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-full">
                            Complied
                        </span>
                    </div>
                    <div className="flex items-center border-t border-gray-200 mt-3 pt-2">
                        <img
                            src={user}
                            alt="Sarah Johnson"
                            className="w-8 h-8 rounded-full mr-3 object-cover"
                        />
                        <div>
                            <p className="text-sm font-semibold" style={{color: '#121212'}}>Lenuelito Betita</p>
                            <p className="text-xs text-gray-500">Program Head</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-md p-4 w-full shadow-md hover:shadow-lg hover:bg-gray-50 transform transition-all duration-300 border border-gray-200">
                    <div className="flex justify-between items-start">
                        <h3 className="text-base font-semibold" style={{color: '#121212'}}>SSLATE</h3>
                        <span className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">
                            Not Complied
                        </span>
                    </div>
                    <div className="flex items-center border-t border-gray-200 mt-3 pt-2">
                        <img
                            src={user}
                            alt="Sarah Johnson"
                            className="w-8 h-8 rounded-full mr-3 object-cover"
                        />
                        <div>
                            <p className="text-sm font-semibold" style={{color: '#121212'}}>Lenuelito Betita</p>
                            <p className="text-xs text-gray-500">Program Head</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-md p-4 w-full shadow-md hover:shadow-lg hover:bg-gray-50 transform transition-all duration-300 border border-gray-200">
                    <div className="flex justify-between items-start">
                        <h3 className="text-base font-semibold" style={{color: '#121212'}}>MIS Office</h3>
                        <span className="px-2 py-1 text-xs font-semibold text-white bg-orange-500 rounded-full">
                            Partially Complied
                        </span>
                    </div>
                    <div className="flex items-center border-t border-gray-200 mt-3 pt-2">
                        <img
                            src={user}
                            alt="Sarah Johnson"
                            className="w-8 h-8 rounded-full mr-3 object-cover"
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

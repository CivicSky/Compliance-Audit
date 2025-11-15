import Header from "../../components/Header/header.jsx";
import user from "../../assets/images/user.svg"
import OfficeP from "../OfficeP/OfficeP.jsx";

export default function OfficeHead() {


    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header pageTitle="Office Head" />
          <OfficeP/>
        </div>
    );
}

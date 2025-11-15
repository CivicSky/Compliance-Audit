import React from "react";
import Header from "../Header/header"
import OfficeP from "../OfficeP/OfficeP";

export default function Home() {
    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header pageTitle="Office Heads" />

            <div className="relative z-10">
                <OfficeP/>
            </div>
        </div>
    );
};




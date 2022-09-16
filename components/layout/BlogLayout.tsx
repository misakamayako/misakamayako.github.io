import Navigation from "../Navigation";
import Footer from "../Footer";
import SideBar from "../SideBar";
import React from "react";

export default function BlogLayout({children}:{children?:React.ReactElement}) {
    return (
        <div className="bg-slate-800 h-screen flex flex-col">
            <Navigation/>
            <div className="flex p-4 grow flex-row h-full overflow-hidden">
                <SideBar/>
                <main className="grow h-full overflow-auto">
                    {children}
                </main>
            </div>
            <Footer/>
        </div>
    )
}

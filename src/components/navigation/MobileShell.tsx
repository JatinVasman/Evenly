import React from "react";
import { InstallBanner } from "../pwa/InstallBanner";
import { PwaRegister } from "../pwa/PwaRegister";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#E5E9E5] sm:py-6 sm:px-4 flex justify-center items-center antialiased text-slate-900">
      <PwaRegister />
      <InstallBanner />

      {/* Native-feeling mobile container with fixed viewport height */}
      <main className="w-full sm:max-w-md h-screen sm:h-[92vh] sm:max-h-[896px] bg-[#F8FAF8] sm:rounded-[36px] shadow-2xl relative flex flex-col overflow-hidden sm:border sm:border-slate-300/80">
        {children}
      </main>
    </div>
  );
}

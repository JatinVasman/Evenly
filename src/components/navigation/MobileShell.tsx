import React from "react";
import { InstallBanner } from "../pwa/InstallBanner";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-[#F8FAF8] sm:static sm:min-h-screen sm:flex sm:justify-center sm:items-center sm:bg-[#E5E9E5] sm:py-6 sm:px-4 antialiased text-slate-900">
      <InstallBanner />

      {/* Native-feeling mobile container with dynamic viewport height */}
      <main className="w-full h-full max-h-[100dvh] sm:max-w-md sm:h-[92vh] sm:max-h-[896px] bg-[#F8FAF8] sm:rounded-[36px] sm:shadow-2xl relative flex flex-col overflow-hidden sm:border sm:border-slate-300/80">
        {children}
      </main>
    </div>
  );
}

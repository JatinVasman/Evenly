"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("Evenly PWA ServiceWorker registered with scope:", reg.scope);
          })
          .catch((err) => {
            console.warn("Evenly PWA ServiceWorker registration failed:", err);
          });
      });
    }
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Service workers break Next.js dev (stale cache, endless loading).
    // Only register in production builds.
    if (process.env.NODE_ENV === "development") {
      const flag = "reader-dev-sw-cleared";
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, "1");

      void (async () => {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      })();
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}

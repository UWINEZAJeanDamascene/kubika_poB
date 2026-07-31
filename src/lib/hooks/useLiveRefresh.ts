import { useEffect } from "react";

export function useLiveRefresh(refresh: () => void | Promise<void>, intervalMs = 120000) {
  useEffect(() => {
    const run = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void refresh();
    };

    const interval = window.setInterval(run, intervalMs);
    const handleFocus = () => run();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh, intervalMs]);
}

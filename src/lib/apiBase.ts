const DEFAULT_API_BASE_URL = "https://api.techmat.rw/api";
const isBetaFrontend = typeof window !== "undefined" && window.location.hostname === "kubika-beta.vercel.app";

export const API_BASE_URL = (
  (isBetaFrontend && import.meta.env.VITE_API_URL_BETA) ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

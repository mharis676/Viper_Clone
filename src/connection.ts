import { Capacitor } from "@capacitor/core";
export const native = Capacitor.isNativePlatform();
export function getBackendUrl() {
  return (
    localStorage.getItem("viper.backendUrl") ||
    import.meta.env.VITE_API_URL ||
    ""
  ).replace(/\/$/, "");
}
export function setBackendUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Use an HTTPS server URL without credentials, query parameters or fragments.",
    );
  localStorage.setItem("viper.backendUrl", url.href.replace(/\/$/, ""));
}
export function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("viper.apiToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

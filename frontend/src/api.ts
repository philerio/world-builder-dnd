/** API prefix: Vite proxies local development requests so phones on the LAN
 * can use the same origin without CORS or hardcoded localhost URLs.
 */
export const API_BASE_URL = import.meta.env.DEV
  ? "/api"
  : (import.meta.env.VITE_API_BASE_URL ?? "");

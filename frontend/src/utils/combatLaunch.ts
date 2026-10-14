export const readCombatToolUrl = () => {
  try { return localStorage.getItem("combat-tool-url") || "http://localhost:1212"; }
  catch { return "http://localhost:1212"; }
};
export const saveCombatToolUrl = (value: string) => {
  try { localStorage.setItem("combat-tool-url", value); } catch { /* The link still works when storage is unavailable. */ }
};
export function combatLaunchUrl(address: string, campaign: string, beat: string, world: string): string | null {
  try {
    const url = new URL(address);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    url.searchParams.set("wbCampaign", campaign); url.searchParams.set("wbBeat", beat); url.searchParams.set("wbWorld", world);
    return url.href;
  } catch { return null; }
}

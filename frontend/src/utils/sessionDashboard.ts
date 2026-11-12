import type { Campaign, CampaignStory, PlayerAction } from "../types";

export function structuredCampaignStory(story: Campaign["story"]): CampaignStory | null {
  if (!story) return { beats: [], player_actions: [], world_clocks: [] };
  if (!("beats" in story)) return null;
  return { ...story, beats: story.beats ?? [], player_actions: story.player_actions ?? [], world_clocks: story.world_clocks ?? [] };
}

export function campaignSessions(story: CampaignStory) {
  const history = [...story.player_actions.flatMap((action) => action.session === undefined ? [] : [action.session]), ...(story.session_recaps ?? []).map((recap) => recap.session), ...(story.session_entries ?? []).map((entry) => entry.session)].filter(Number.isFinite);
  const unreviewed = story.player_actions.flatMap((action) => !action.reviewed && action.session !== undefined ? [action.session] : []).filter(Number.isFinite);
  const next = history.length ? Math.max(...history) + 1 : 1;
  const live = unreviewed.length ? Math.max(...unreviewed) : history.length ? Math.max(...history) : next;
  return { next: Math.max(1, next), live: Math.max(1, live) };
}

export function selectDashboardCampaign(campaigns: Campaign[], lastId?: string): Campaign | undefined {
  const remembered = campaigns.find((campaign) => campaign.id === lastId);
  if (remembered) return remembered;
  const rank = (status?: string) => ({ active: 0, in_progress: 0, ongoing: 0, planned: 1, paused: 2, completed: 4 }[status?.toLowerCase() ?? ""] ?? 3);
  return [...campaigns].sort((a, b) => rank(a.status) - rank(b.status) || a.name.localeCompare(b.name))[0];
}

export function campaignWorkspaceUrl(campaignId: string, workspace: "dashboard" | "prep" | "session" = "dashboard", session?: number, section?: string): string {
  const query = new URLSearchParams();
  if (workspace !== "dashboard") query.set("workspace", workspace);
  if (session !== undefined) query.set("session", String(session));
  if (section) query.set("section", section);
  return `/campaigns/${encodeURIComponent(campaignId)}${query.size ? `?${query}` : ""}`;
}

export function appendCapturedAction(campaign: Campaign, action: PlayerAction): Campaign {
  const story = structuredCampaignStory(campaign.story);
  if (!story) throw new Error("This campaign uses older story content. Save this as an idea in the scratchpad instead.");
  if (action.story_beat && !story.beats.some((beat) => beat.id === action.story_beat)) throw new Error("The selected plot point is no longer available. Record without attaching it, or reopen this campaign.");
  if (story.player_actions.some((existing) => existing.id === action.id)) return campaign;
  return { ...campaign, story: { ...story, player_actions: [action, ...story.player_actions] } };
}

export function dashboardAttention(story: CampaignStory) {
  return {
    actions: story.player_actions.filter((action) => !action.reviewed),
    clocks: story.world_clocks.filter((clock) => clock.status === "active").sort((a, b) => b.current / Math.max(1, b.maximum) - a.current / Math.max(1, a.maximum)),
    consequences: story.beats.flatMap((beat) => (beat.consequences ?? []).filter((consequence) => consequence.status === "pending" || consequence.status === "active").map((consequence) => ({ beat, consequence }))),
  };
}

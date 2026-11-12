import { useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useWorldData } from "../context/WorldDataContext";
import useDraftProtection from "../hooks/useDraftProtection";
import { draftKey, readEntityDraft, removeEntityDraft } from "../utils/entityDrafts";
import { appendCapturedAction, campaignSessions, structuredCampaignStory } from "../utils/sessionDashboard";
import type { Campaign } from "../types";
import UnsavedChangesDialog from "./UnsavedChangesDialog";

type Kind = "action" | "idea";
const EMPTY_CAPTURE = { text: "", session: "", attach: true };

function newActionId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (globalThis.crypto?.getRandomValues) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return `action-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  return `action-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function DashboardQuickCapture({ worldId, campaign }: { worldId: string; campaign?: Campaign }) {
  const { loadEntity, updateEntity, createEntity } = useWorldData();
  const story = campaign ? structuredCampaignStory(campaign.story) : null;
  const currentBeat = story?.beats.find((beat) => beat.id === story.current_beat);
  const defaultSession = story ? String(campaignSessions(story).live) : "";
  const keyFor = (kind: Kind) => draftKey(worldId, `dashboard-capture:${campaign?.id ?? "world"}:${kind}`);
  const recover = (kind: Kind) => {
    const draft = readEntityDraft(keyFor(kind));
    return {
      kind,
      text: typeof draft?.data.text === "string" ? draft.data.text : "",
      session: typeof draft?.data.session === "string" ? draft.data.session : defaultSession,
      attach: typeof draft?.data.attach === "boolean" ? draft.data.attach : true,
      recovered: Boolean(draft),
    };
  };
  const [capture, setCapture] = useState(() => recover(campaign && story ? "action" : "idea"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const storageKey = keyFor(capture.kind);
  const draftData = useMemo(() => ({ text: capture.text, session: capture.session, attach: capture.attach }), [capture.text, capture.session, capture.attach]);
  const draftStatus = useDraftProtection({ key: storageKey, entityType: capture.kind === "action" ? "player_action" : "dm_scratchpad_entry", base: EMPTY_CAPTURE, data: draftData, active: true, dirty: Boolean(capture.text) });

  const save = async () => {
    if (saving || !capture.text.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (capture.kind === "action") {
        if (!campaign) throw new Error("Choose a campaign before recording a party action.");
        const session = capture.session.trim() ? Number(capture.session) : undefined;
        if (session !== undefined && (!Number.isInteger(session) || session < 1)) throw new Error("Enter a positive session number, or leave it blank.");
        const latest = await loadEntity(campaign.id);
        if (latest.entity_type !== "campaign") throw new Error("This campaign is no longer available.");
        const next = appendCapturedAction(latest.entity as unknown as Campaign, {
          id: newActionId(), description: capture.text.trim(), session,
          story_beat: capture.attach ? currentBeat?.id : undefined,
          consequence_ids: [], reviewed: false,
        });
        await updateEntity(campaign.id, { ...next });
        setSuccess(session === undefined ? "Party action recorded. Review it during session closeout." : `Party action recorded for Session ${session}.`);
      } else {
        const text = capture.text.trim();
        await createEntity("dm_scratchpad_entry", { name: text.split(/\r?\n/)[0].slice(0, 100), content: text, status: "inbox" });
        setSuccess("Idea saved to the DM Scratchpad.");
      }
      removeEntityDraft(storageKey);
      setCapture((current) => ({ ...current, text: "", recovered: false }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this capture.");
    } finally { setSaving(false); }
  };

  return (
    <>
    <Card component="section" aria-labelledby="quick-capture-heading" sx={{ height: "100%" }}>
      <CardContent>
        <Typography id="quick-capture-heading" variant="h2" sx={{ mb: 2 }}>Quick capture</Typography>
        <Stack spacing={2}>
          <TextField select size="small" label="Capture type" value={capture.kind} disabled={saving} onChange={(event) => { setCapture(recover(event.target.value as Kind)); setError(null); setSuccess(null); }}>
            <MenuItem value="action" disabled={!campaign || !story}>Party action</MenuItem>
            <MenuItem value="idea">Idea for the scratchpad</MenuItem>
          </TextField>
          {campaign && !story && <Typography variant="body2" color="text.secondary">This campaign uses older story content. You can capture ideas here without changing it.</Typography>}
          {capture.recovered && <Alert severity="info">Recovered your unfinished capture from this browser.</Alert>}
          <TextField label={capture.kind === "action" ? "What did the party do?" : "Capture an idea"} multiline minRows={3} value={capture.text} disabled={saving} onChange={(event) => setCapture((current) => ({ ...current, text: event.target.value }))} />
          {capture.kind === "action" && (
            <>
              <TextField label="Session (optional)" type="number" size="small" value={capture.session} disabled={saving} slotProps={{ htmlInput: { min: 1, step: 1 } }} onChange={(event) => setCapture((current) => ({ ...current, session: event.target.value }))} />
              {currentBeat && <FormControlLabel control={<Checkbox checked={capture.attach} disabled={saving} onChange={(_event, attach) => setCapture((current) => ({ ...current, attach }))} />} label={`Link to current plot point: ${currentBeat.name}`} />}
            </>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          {capture.text && <Typography variant="caption" color={draftStatus === "unavailable" ? "warning.main" : "text.secondary"}>{draftStatus === "unavailable" ? "Browser draft storage is unavailable. Save before leaving this page." : "Unfinished captures stay in this browser until you save or clear them."}</Typography>}
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
            {capture.text && <Button disabled={saving} onClick={() => setDiscardOpen(true)}>Clear draft</Button>}
            <Button variant="contained" disabled={saving || !capture.text.trim()} onClick={() => void save()}>{saving ? "Saving…" : capture.kind === "action" ? "Record party action" : "Save idea"}</Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
    <UnsavedChangesDialog open={discardOpen} canKeepDraft={false} onKeepEditing={() => setDiscardOpen(false)} onKeepDraft={() => setDiscardOpen(false)} onDiscard={() => { removeEntityDraft(storageKey); setCapture((current) => ({ ...current, text: "", recovered: false })); setError(null); setDiscardOpen(false); }} />
    </>
  );
}

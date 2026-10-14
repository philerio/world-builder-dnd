import { useState } from "react";
import { Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { CombatEncounter, CombatParticipant, EntitySummary } from "../types";
import { combatLaunchUrl, readCombatToolUrl, saveCombatToolUrl } from "../utils/combatLaunch";

export function EncounterLaunchButton({ campaignId, beatId, worldId }: { campaignId: string; beatId: string; worldId: string }) {
  const [address, setAddress] = useState(readCombatToolUrl);
  const href = combatLaunchUrl(address, campaignId, beatId, worldId);
  return <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
    <TextField size="small" label="Combat app URL" value={address} onChange={(event) => { setAddress(event.target.value); saveCombatToolUrl(event.target.value); }} helperText="Optional; saved on this browser." />
    <Button component="a" href={href || undefined} target="_blank" rel="noopener noreferrer" disabled={!href}>Open in Combat Tool</Button>
  </Stack>;
}

export default function CombatEncounterEditor({ value, onChange, entities, maps, locations, disabled = false }: {
  value?: CombatEncounter;
  onChange: (value: CombatEncounter | undefined) => void;
  entities: EntitySummary[];
  maps: { id: string; name: string; image_path?: string }[];
  locations: EntitySummary[];
  disabled?: boolean;
}) {
  const update = (change: Partial<CombatEncounter>) => { if (value) onChange({ ...value, ...change }); };
  const participant = (id: string, change: Partial<CombatParticipant>) => update({ participants: value!.participants.map((item) => item.id === id ? { ...item, ...change } : item) });
  if (!value) return <Button disabled={disabled} onClick={() => onChange({ id: crypto.randomUUID(), name: "Encounter", participants: [] })}>Attach combat encounter</Button>;
  return <Card variant="outlined"><CardContent><Stack spacing={2}>
    <Typography variant="h6">Combat encounter</Typography>
    <Typography variant="body2">Prepare the roster here and run the fight in the optional Combat Tool. The campaign party can be included when importing. Combat stays independent.</Typography>
    <TextField label="Encounter name" value={value.name} disabled={disabled} onChange={(event) => update({ name: event.target.value })} slotProps={{ htmlInput: { maxLength: 100 } }} />
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      <TextField select fullWidth label="Battle-map image" value={value.map_id || ""} disabled={disabled} onChange={(event) => update({ map_id: event.target.value || undefined })} helperText="Shares the image; world markers and drawings stay here.">
        <MenuItem value="">No map</MenuItem>{maps.filter((map) => map.image_path).map((map) => <MenuItem key={map.id} value={map.id}>{map.name}</MenuItem>)}
      </TextField>
      <TextField select fullWidth label="Encounter location" value={value.location_id || ""} disabled={disabled} onChange={(event) => update({ location_id: event.target.value || undefined })}>
        <MenuItem value="">No location</MenuItem>{locations.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
      </TextField>
    </Stack>
    <TextField label="DM encounter notes" value={value.notes || ""} multiline minRows={2} disabled={disabled} onChange={(event) => update({ notes: event.target.value })} slotProps={{ htmlInput: { maxLength: 10000 } }} />
    {value.participants.map((item, index) => <Box key={item.id} sx={{ border: "1px solid", borderColor: "divider", p: 1.5, borderRadius: 1 }}><Stack spacing={1}>
      <Typography>Combatant {index + 1}</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField select fullWidth label={`World character ${index + 1}`} value={item.entity_id || ""} disabled={disabled} onChange={(event) => participant(item.id, { entity_id: event.target.value || undefined })}>
          <MenuItem value="">Generic combatant</MenuItem>{entities.filter((entry) => ["npc", "player_character"].includes(entry.entity_type)).map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}
        </TextField>
        <TextField fullWidth label={`Combatant name ${index + 1}`} value={item.name || ""} disabled={disabled} onChange={(event) => participant(item.id, { name: event.target.value })} helperText="Optional when linked to a world character." />
        <TextField select label={`Allegiance ${index + 1}`} value={item.allegiance} disabled={disabled} onChange={(event) => participant(item.id, { allegiance: event.target.value as CombatParticipant["allegiance"], quantity: event.target.value === "party" ? 1 : item.quantity })} sx={{ minWidth: 140 }}>
          <MenuItem value="party">Party</MenuItem><MenuItem value="ally">Ally</MenuItem><MenuItem value="enemy">Enemy</MenuItem>
        </TextField>
        <TextField label={`Quantity ${index + 1}`} type="number" value={item.quantity} disabled={disabled || item.allegiance === "party"} onChange={(event) => participant(item.id, { quantity: Number(event.target.value) })} slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }} sx={{ width: 100 }} />
      </Stack>
      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
        {(["hp", "ac", "level"] as const).map((field) => <TextField key={field} label={`${field.toUpperCase()} ${index + 1} (optional)`} type="number" value={item.stats?.[field] ?? ""} disabled={disabled} sx={{ width: 160 }} slotProps={{ htmlInput: { min: field === "level" ? 1 : 0, step: 1 } }} onChange={(event) => participant(item.id, { stats: { ...item.stats, [field]: event.target.value === "" ? undefined : Number(event.target.value) } })} />)}
        <Button color="error" disabled={disabled} onClick={() => update({ participants: value.participants.filter((entry) => entry.id !== item.id) })}>Remove combatant</Button>
      </Stack>
    </Stack></Box>)}
    <Typography variant="body2">Leave stats blank to use a combat template or quick-start defaults in the Combat Tool. Existing linked party members keep their current combat stats and HP.</Typography>
    <Stack direction="row" spacing={1}>
      <Button disabled={disabled || value.participants.length >= 100} onClick={() => update({ participants: [...value.participants, { id: crypto.randomUUID(), name: "Enemy", allegiance: "enemy", quantity: 1 }] })}>Add combatant</Button>
      <Button color="error" disabled={disabled} onClick={() => onChange(undefined)}>Remove encounter attachment</Button>
    </Stack>
  </Stack></CardContent></Card>;
}

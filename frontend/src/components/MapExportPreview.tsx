import { useEffect, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Tab, Tabs, Typography } from "@mui/material";
import type { Map as WorldMap } from "../types";
import { flattenMapPair } from "../utils/playerMapExport";

export default function MapExportPreview({ map }: { map: WorldMap }) {
  const [preview, setPreview] = useState<{ player: string; dm: string } | null>(null);
  const [audience, setAudience] = useState<"player" | "dm">("player");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => { if (preview) { URL.revokeObjectURL(preview.player); URL.revokeObjectURL(preview.dm); } }, [preview]);
  return <>
    <Button size="small" variant="outlined" disabled={busy} onClick={async () => {
      setBusy(true); setError("");
      try { const pair = await flattenMapPair(map); setAudience("player"); setPreview({ player: URL.createObjectURL(pair.player), dm: URL.createObjectURL(pair.dm) }); }
      catch (error) { setError(error instanceof Error ? error.message : "Could not preview this map."); }
      finally { setBusy(false); }
    }}>{busy ? "Preparing preview…" : "Preview player map"}</Button>
    {error && <Alert severity="error">{error}</Alert>}
    <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="lg" fullWidth>
      <DialogTitle>Map export preview</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>Preview of the current map draft. Publishing remains a separate action.</Typography>
        <Tabs value={audience} onChange={(_event, value) => setAudience(value)}><Tab value="player" label="Player view" /><Tab value="dm" label="DM view" /></Tabs>
        {preview && <Box component="img" src={preview[audience]} alt={`${audience === "player" ? "Player" : "DM"} map preview`} sx={{ display: "block", maxWidth: "100%", maxHeight: "70dvh", mx: "auto", mt: 1 }} />}
      </DialogContent>
      <DialogActions><Button onClick={() => setPreview(null)}>Close preview</Button></DialogActions>
    </Dialog>
  </>;
}

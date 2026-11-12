import { useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Dialog, DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useWorldData } from "../context/WorldDataContext";
import { buildSearchIndex, searchWorld } from "../utils/worldSearch";

export default function WorldSearchDialog({ open, onClose, onOpenEntity }: { open: boolean; onClose: () => void; onOpenEntity: (id: string) => void }) {
  const { entities, entitiesLoading, entitiesError, getEntity } = useWorldData();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const index = useMemo(() => buildSearchIndex(entities, getEntity), [entities, getEntity]);
  const types = useMemo(() => [...new Set(index.map((record) => record.typeLabel))].sort(), [index]);
  const matches = useMemo(() => searchWorld(index, query, type), [index, query, type]);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 7 }}>Search the world<IconButton aria-label="Close search" onClick={onClose} sx={{ position: "absolute", right: 12, top: 12 }}><CloseIcon /></IconButton></DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">Find names, descriptions, tags, and notes. Results can include DM-only information.</Typography>
          {entitiesError && <Alert severity="error">Could not load all records: {entitiesError}</Alert>}
          <TextField select size="small" label="Record type" value={type} slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }} onChange={(event) => setType(event.target.value)}>
            <MenuItem value="">All record types</MenuItem>
            {types.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
          </TextField>
          <Autocomplete
            autoHighlight
            openOnFocus
            options={matches.slice(0, 80)}
            filterOptions={(options) => options}
            inputValue={query}
            onInputChange={(_event, value, reason) => { if (reason === "input" || reason === "clear") setQuery(value); }}
            getOptionLabel={(record) => record.name}
            getOptionKey={(record) => record.id}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            loading={entitiesLoading}
            noOptionsText={entitiesLoading ? "Loading world records…" : "No matching records"}
            onChange={(_event, selected) => { if (selected) { onClose(); onOpenEntity(selected.id); } }}
            renderOption={(props, record) => {
              const { key, ...optionProps } = props;
              return <Box component="li" key={key} {...optionProps}>
                <Stack sx={{ minWidth: 0, py: 0.5, overflowWrap: "anywhere" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{record.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{record.typeLabel}{record.path ? ` · ${record.path}` : ""}</Typography>
                  {record.snippet && <Typography variant="caption" color={record.snippet.dmOnly ? "warning.main" : "text.secondary"}>
                    {record.snippet.label}{record.snippet.dmOnly ? " (DM only)" : ""}: {record.snippet.text}
                  </Typography>}
                </Stack>
              </Box>;
            }}
            renderInput={(params) => <TextField {...params} autoFocus label="Find a record" placeholder="Search names, tags, descriptions, notes…" />}
          />
          <Typography variant="caption" role="status" color="text.secondary">{matches.length > 80 ? `Showing 80 of ${matches.length} matches. Refine your search to see more.` : `${matches.length} matching records`}</Typography>
          <Typography variant="caption" color="text.secondary">Tip: press Ctrl+K or ⌘K to open search.</Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

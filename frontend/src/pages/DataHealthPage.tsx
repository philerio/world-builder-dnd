import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Autocomplete,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RefreshIcon from "@mui/icons-material/Refresh";
import CodeIcon from "@mui/icons-material/Code";
import SaveIcon from "@mui/icons-material/Save";
import BuildIcon from "@mui/icons-material/Build";
import type { EntitySummary } from "../types";

type ValidationIssue = {
  message: string;
  severity?: "error" | "warning";
  source_type?: string;
  source_id?: string;
  source_path?: string;
  file_name?: string;
  reference_id?: string;
  reference_type?: string;
  reference_path?: (string | number)[];
};

type ValidationReport = {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  issues: ValidationIssue[];
};

type YamlPreview = {
  valid: boolean;
  validation_error: string;
  diff: string;
  has_changes: boolean;
};

type YamlBackup = {
  backup_id: string;
  created_at: string;
  size: number;
};

type DataHealthPageProps = {
  onOpenEntity: (entityId: string) => void;
  onValidationReport: (counts: { errors: number; warnings: number }) => void;
  onDataSaved: (entityId?: string) => Promise<void>;
  entities: EntitySummary[];
};

export default function DataHealthPage({ onOpenEntity, onValidationReport, onDataSaved, entities }: DataHealthPageProps) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingIssue, setEditingIssue] = useState<ValidationIssue | null>(null);
  const [yamlContent, setYamlContent] = useState("");
  const [yamlPath, setYamlPath] = useState("");
  const [yamlPreview, setYamlPreview] = useState<YamlPreview | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [savingYaml, setSavingYaml] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [backups, setBackups] = useState<YamlBackup[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<YamlBackup | null>(null);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [repairIssue, setRepairIssue] = useState<ValidationIssue | null>(null);
  const [replacement, setReplacement] = useState<EntitySummary | null>(null);
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

  const repairCandidates = (issue: ValidationIssue) => entities.filter((entity) => {
    switch (issue.reference_type) {
      case "character": return ["npc", "player_character"].includes(entity.entity_type);
      case "location": return ["city", "location", "region", "kingdom"].includes(entity.entity_type);
      case "entity": return true;
      default: return entity.entity_type === issue.reference_type;
    }
  });

  const prepareRepair = async () => {
    if (!repairIssue?.source_type || !repairIssue.file_name || !repairIssue.reference_type || !repairIssue.reference_path || !repairIssue.reference_id || !replacement) return;
    setRepairLoading(true);
    setRepairError(null);
    try {
      const endpoint = `http://localhost:8000/data-health/yaml/${encodeURIComponent(repairIssue.source_type)}/${encodeURIComponent(repairIssue.file_name)}/replace-reference`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_type: repairIssue.reference_type,
          reference_path: repairIssue.reference_path,
          reference_id: repairIssue.reference_id,
          replacement_id: replacement.id,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Could not prepare this repair.");
      setEditingIssue(repairIssue);
      setYamlContent(result.content);
      setYamlPath(result.path);
      setYamlPreview(result as YamlPreview);
      setEditorError(null);
      setRepairIssue(null);
      setReplacement(null);
    } catch (error) {
      setRepairError(error instanceof Error ? error.message : "Could not prepare this repair.");
    } finally {
      setRepairLoading(false);
    }
  };

  const yamlEndpoint = (issue: ValidationIssue) => issue.source_type && issue.file_name
    ? `http://localhost:8000/data-health/yaml/${encodeURIComponent(issue.source_type)}/${encodeURIComponent(issue.file_name)}`
    : `http://localhost:8000/entities/${encodeURIComponent(issue.source_id ?? "")}/yaml`;

  const openYamlEditor = async (issue: ValidationIssue) => {
    if (!issue.file_name && !issue.source_id) return;
    setEditingIssue(issue);
    setEditorLoading(true);
    setEditorError(null);
    try {
      const response = await fetch(yamlEndpoint(issue));
      const result = await response.json();
      if (!response.ok) {
        throw new Error(typeof result.detail === "string" ? result.detail : "Could not load the YAML source.");
      }
      setYamlContent(result.content);
      setYamlPath(result.path);
      setYamlPreview(null);
    } catch (loadError) {
      setEditorError(loadError instanceof Error ? loadError.message : "Could not load the YAML source.");
    } finally {
      setEditorLoading(false);
    }
  };

  const previewYaml = async () => {
    if (!editingIssue) return;
    setEditorError(null);
    try {
      const response = await fetch(`${yamlEndpoint(editingIssue)}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: yamlContent }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(typeof result.detail === "string" ? result.detail : "Could not preview these changes.");
      }
      setYamlPreview(result as YamlPreview);
    } catch (previewError) {
      setEditorError(previewError instanceof Error ? previewError.message : "Could not preview these changes.");
    }
  };

  const openHistory = async () => {
    if (!editingIssue) return;
    setHistoryLoading(true);
    setHistoryError(null);
    setBackups([]);
    setSelectedBackup(null);
    setHistoryOpen(true);
    try {
      const response = await fetch(`${yamlEndpoint(editingIssue)}/backups`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(typeof result.detail === "string" ? result.detail : "Could not load saved versions.");
      }
      setBackups(result as YamlBackup[]);
    } catch (loadError) {
      setHistoryError(loadError instanceof Error ? loadError.message : "Could not load saved versions.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const restoreBackup = async () => {
    if (!editingIssue || !selectedBackup) return;
    setRestoringBackup(true);
    setHistoryError(null);
    try {
      const response = await fetch(`${yamlEndpoint(editingIssue)}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup_id: selectedBackup.backup_id }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(typeof result.detail === "string" ? result.detail : "Could not restore this version.");
      }
      await onDataSaved(editingIssue.source_id);
      setHistoryOpen(false);
      setSelectedBackup(null);
      setEditingIssue(null);
      setRefreshKey((current) => current + 1);
      setLoading(true);
    } catch (restoreError) {
      setHistoryError(restoreError instanceof Error ? restoreError.message : "Could not restore this version.");
    } finally {
      setRestoringBackup(false);
    }
  };

  const saveYaml = async () => {
    if (!editingIssue || (!editingIssue.source_id && !editingIssue.file_name) || !yamlPreview?.valid || !yamlPreview.has_changes) return;
    setSavingYaml(true);
    setEditorError(null);
    try {
      const response = await fetch(yamlEndpoint(editingIssue), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: yamlContent }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(typeof result.detail === "string" ? result.detail : "Could not save the YAML source.");
      }
      await onDataSaved(editingIssue.source_id);
      setEditingIssue(null);
      setRefreshKey((current) => current + 1);
      setLoading(true);
    } catch (saveError) {
      setEditorError(saveError instanceof Error ? saveError.message : "Could not save the YAML source.");
    } finally {
      setSavingYaml(false);
    }
  };

  useEffect(() => {
    let active = true;

    fetch("http://localhost:8000/validation")
      .then((response) => {
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        return response.json() as Promise<ValidationReport>;
      })
      .then((result) => {
        if (active) {
          setReport(result);
          onValidationReport({ errors: result.errors?.length ?? 0, warnings: result.warnings?.length ?? 0 });
        }
      })
      .catch((loadError: Error) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [onValidationReport, refreshKey]);

  const issues: ValidationIssue[] = report?.issues ?? [
    ...(report?.errors.map((message) => ({ message, severity: "error" as const })) ?? []),
    ...(report?.warnings?.map((message) => ({ message, severity: "warning" as const })) ?? []),
  ];
  const errorCount = report?.errors.length ?? 0;
  const warningCount = report?.warnings?.length ?? 0;

  return (
    <Stack spacing={3}>
      <Box sx={{ px: { xs: 3, md: 5 }, py: { xs: 4, md: 5 }, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.15em" }}>
              WORLD MAINTENANCE
            </Typography>
            <Typography variant="h1" sx={{ mt: 0.5 }}>Data Health</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Find broken references and open the record that needs attention.
            </Typography>
          </Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => {
              setLoading(true);
              setError(null);
              setRefreshKey((current) => current + 1);
            }}
            disabled={loading}
          >
            Recheck
          </Button>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 3, md: 5 }, pb: 5 }}>
        {loading && <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><CircularProgress size={20} /><Typography color="text.secondary">Checking world data…</Typography></Stack>}
        {error && <Alert severity="error">Could not validate world data: {error}</Alert>}
        {!loading && !error && report && (
          <Stack spacing={2}>
            {errorCount === 0 && warningCount === 0 ? (
              <Alert icon={<FactCheckIcon />} severity="success">
                All checked references are valid. No problems found.
              </Alert>
            ) : errorCount > 0 ? (
              <Alert severity="error">
                Found {errorCount} {errorCount === 1 ? "error" : "errors"}{warningCount > 0 ? ` and ${warningCount} ${warningCount === 1 ? "warning" : "warnings"}` : ""} that may need attention.
              </Alert>
            ) : (
              <Alert severity="warning">
                Found {warningCount} {warningCount === 1 ? "warning" : "warnings"} that may need attention.
              </Alert>
            )}

            {issues.map((issue, index) => (
              <Card key={`${issue.source_id ?? "unknown"}-${index}`} variant="outlined" sx={{ borderLeft: 3, borderLeftColor: issue.severity === "warning" ? "warning.main" : "error.main" }}>
                <CardContent>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography>{issue.message}</Typography>
                      {(issue.source_id || issue.file_name) && (
                        <Typography variant="caption" color="text.secondary">
                          In {issue.source_type?.replaceAll("_", " ") ?? "record"} · {issue.source_path ?? issue.source_id ?? issue.file_name}
                        </Typography>
                      )}
                    </Box>
                    {(issue.source_id || issue.file_name) && (
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexShrink: 0 }}>
                        {issue.reference_type && issue.reference_path && issue.reference_id && issue.source_type && issue.file_name && (
                          <Button size="small" startIcon={<BuildIcon />} onClick={() => {
                            setRepairIssue(issue);
                            setReplacement(null);
                            setRepairError(null);
                          }}>
                            Repair reference
                          </Button>
                        )}
                        {issue.source_id && (
                          <Button size="small" onClick={() => onOpenEntity(issue.source_id!)}>
                            Open record
                          </Button>
                        )}
                        {issue.source_type && (issue.file_name || issue.source_id) && (
                          <Button size="small" startIcon={<CodeIcon />} onClick={() => void openYamlEditor(issue)}>
                            Edit YAML
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      <Dialog open={Boolean(repairIssue)} onClose={() => !repairLoading && setRepairIssue(null)} fullWidth maxWidth="sm">
        <DialogTitle>Repair broken reference</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              Replace “{repairIssue?.reference_id}” in {repairIssue?.source_path ?? repairIssue?.file_name}. The YAML diff will be shown before anything is saved.
            </Alert>
            {repairError && <Alert severity="error">{repairError}</Alert>}
            <Autocomplete
              options={repairIssue ? repairCandidates(repairIssue) : []}
              value={replacement}
              onChange={(_event, value) => setReplacement(value)}
              getOptionLabel={(option) => `${option.name} (${option.entity_type.replaceAll("_", " ")})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label={`Choose ${repairIssue?.reference_type?.replaceAll("_", " ") ?? "replacement"}`} />}
              noOptionsText="No matching entities are available."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRepairIssue(null)} disabled={repairLoading}>Cancel</Button>
          <Button variant="contained" startIcon={repairLoading ? <CircularProgress size={16} color="inherit" /> : <BuildIcon />} onClick={() => void prepareRepair()} disabled={!replacement || repairLoading}>
            {repairLoading ? "Preparing…" : "Preview repair"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingIssue)}
        onClose={() => !savingYaml && setEditingIssue(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Edit YAML source</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {yamlPath || (editingIssue ? `${editingIssue.source_type} · ${editingIssue.source_id ?? editingIssue.file_name}` : "")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Saving checks the YAML syntax and entity fields. Comments and formatting are preserved.
          </Typography>
          {editorError && <Alert severity="error" sx={{ mb: 2 }}>{editorError}</Alert>}
          {editorLoading ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", py: 5 }}>
              <CircularProgress size={20} />
              <Typography color="text.secondary">Loading YAML source…</Typography>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <TextField
                value={yamlContent}
                onChange={(event) => {
                  setYamlContent(event.target.value);
                  setYamlPreview(null);
                }}
                fullWidth
                multiline
                minRows={22}
                disabled={savingYaml}
                slotProps={{ htmlInput: { spellCheck: false } }}
                sx={{ "& textarea": { fontFamily: "monospace", fontSize: "0.875rem", lineHeight: 1.5 } }}
              />
              {yamlPreview && (
                <Box>
                  <Alert severity={yamlPreview.valid ? "success" : "error"} sx={{ mb: 1.5 }}>
                    {yamlPreview.valid
                      ? yamlPreview.has_changes ? "YAML is valid. Review the diff before saving." : "No changes to save."
                      : yamlPreview.validation_error}
                  </Alert>
                  <Box
                    role="region"
                    aria-label="YAML change preview"
                    sx={{ maxHeight: 360, overflow: "auto", p: 1.5, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default", fontFamily: "monospace", fontSize: "0.8rem" }}
                  >
                    {yamlPreview.diff ? yamlPreview.diff.split("\n").map((line, index) => (
                      <Box
                        key={`${index}-${line}`}
                        sx={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          color: line.startsWith("+") && !line.startsWith("+++")
                            ? "success.main"
                            : line.startsWith("-") && !line.startsWith("---")
                              ? "error.main"
                              : "text.secondary",
                        }}
                      >
                        {line || " "}
                      </Box>
                    )) : <Typography color="text.secondary">No differences found.</Typography>}
                  </Box>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditingIssue(null)} disabled={savingYaml}>Cancel</Button>
          <Button onClick={() => void openHistory()} disabled={editorLoading || savingYaml}>
            Version history
          </Button>
          <Button
            variant="contained"
            startIcon={savingYaml ? <CircularProgress size={16} color="inherit" /> : yamlPreview ? <SaveIcon /> : <CodeIcon />}
            onClick={() => void (yamlPreview ? saveYaml() : previewYaml())}
            disabled={editorLoading || savingYaml || !yamlContent || (Boolean(yamlPreview) && (!yamlPreview?.valid || !yamlPreview.has_changes))}
          >
            {yamlPreview ? "Save YAML" : "Preview changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historyOpen} onClose={() => !restoringBackup && setHistoryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>YAML version history</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
            Each saved edit keeps the previous file. Restoring a version also saves the current file as another backup.
          </Typography>
          {historyError && <Alert severity="error" sx={{ mb: 2 }}>{historyError}</Alert>}
          {historyLoading ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", py: 3 }}>
              <CircularProgress size={20} />
              <Typography color="text.secondary">Loading saved versions…</Typography>
            </Stack>
          ) : backups.length === 0 ? (
            <Typography color="text.secondary">No saved versions yet. A backup is created when you save a change.</Typography>
          ) : (
            <Stack spacing={1}>
              {backups.map((backup) => (
                <Box
                  key={backup.backup_id}
                  sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between", border: 1, borderColor: selectedBackup?.backup_id === backup.backup_id ? "primary.main" : "divider", borderRadius: 1, p: 1.5 }}
                >
                  <Box>
                    <Typography>{new Date(backup.created_at).toLocaleString()}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.max(1, Math.ceil(backup.size / 1024))} KB
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => setSelectedBackup(backup)} disabled={restoringBackup}>
                    {selectedBackup?.backup_id === backup.backup_id ? "Selected" : "Select"}
                  </Button>
                </Box>
              ))}
            </Stack>
          )}
          {selectedBackup && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Restore the version from {new Date(selectedBackup.created_at).toLocaleString()}? This replaces the current file and discards unsaved editor text. The current file will first be backed up.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setHistoryOpen(false)} disabled={restoringBackup}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={() => void restoreBackup()} disabled={!selectedBackup || restoringBackup}>
            {restoringBackup ? "Restoring…" : "Restore selected version"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

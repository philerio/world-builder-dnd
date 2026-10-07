import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RefreshIcon from "@mui/icons-material/Refresh";

type ValidationIssue = {
  message: string;
  severity?: "error" | "warning";
  source_type?: string;
  source_id?: string;
};

type ValidationReport = {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  issues: ValidationIssue[];
};

type DataHealthPageProps = {
  onOpenEntity: (entityId: string) => void;
  onValidationReport: (counts: { errors: number; warnings: number }) => void;
};

export default function DataHealthPage({ onOpenEntity, onValidationReport }: DataHealthPageProps) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
                      {issue.source_id && (
                        <Typography variant="caption" color="text.secondary">
                          In {issue.source_type?.replaceAll("_", " ") ?? "record"} · {issue.source_id}
                        </Typography>
                      )}
                    </Box>
                    {issue.source_id && (
                      <Button size="small" onClick={() => onOpenEntity(issue.source_id!)} sx={{ flexShrink: 0 }}>
                        Open record
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

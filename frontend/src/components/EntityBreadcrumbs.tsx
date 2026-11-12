import { Breadcrumbs, Button, Typography } from "@mui/material";
import { useWorldData } from "../context/WorldDataContext";
import type { EntityData } from "../types";
import { entityTypeLabel, locationBreadcrumbs } from "../utils/entityNavigation";

export default function EntityBreadcrumbs({ record, onOpenEntity }: { record: EntityData; onOpenEntity?: (id: string) => void }) {
  const { getEntity } = useWorldData();
  const path = locationBreadcrumbs(record, getEntity);
  if (path.length < 2) return null;
  return (
    <Breadcrumbs aria-label="Location hierarchy" separator="›" sx={{ mb: 1.5, "& .MuiBreadcrumbs-ol": { gap: 0.25 }, "& .MuiBreadcrumbs-li": { minWidth: 0, maxWidth: "100%" } }}>
      {path.map((item, index) => index === path.length - 1 ? (
        <Typography key={item.id} variant="caption" aria-current="page" sx={{ overflowWrap: "anywhere" }}>{String(item.entity.name ?? item.id)}</Typography>
      ) : (
        <Button key={item.id} size="small" onClick={() => onOpenEntity?.(item.id)} disabled={!onOpenEntity} title={entityTypeLabel(item.entity_type, item.entity)} sx={{ minWidth: 0, minHeight: 36, textTransform: "none", textAlign: "left", overflowWrap: "anywhere" }}>
          {String(item.entity.name ?? item.id)}
        </Button>
      ))}
    </Breadcrumbs>
  );
}

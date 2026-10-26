import type { ReactNode } from "react";
import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import type { EntitySummary, PoliticalOffice, PoliticalOfficeReference } from "../types";
import { useWorldData } from "../context/WorldDataContext";

type PoliticalLeadershipDetailsProps = {
  entity: Record<string, unknown>;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
};

function asOffices(value: unknown): PoliticalOffice[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is PoliticalOffice =>
      typeof item === "object" && item !== null &&
      typeof (item as PoliticalOffice).id === "string" &&
      typeof (item as PoliticalOffice).title === "string",
  );
}

function asReferences(value: unknown): PoliticalOfficeReference[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is PoliticalOfficeReference =>
      typeof item === "object" && item !== null &&
      typeof (item as PoliticalOfficeReference).entity_id === "string" &&
      typeof (item as PoliticalOfficeReference).office_id === "string",
  );
}

function PoliticalLeadershipDetails({
  entity,
  onOpenEntity,
  getEntity,
}: PoliticalLeadershipDetailsProps) {
  const { worldData } = useWorldData();
  const entityId = typeof entity.id === "string" ? entity.id : "";
  const offices = asOffices(entity.leadership);
  const politicalEntities = [
    ...(worldData?.kingdoms ?? []),
    ...(worldData?.cities ?? []),
  ];
  const officeByReference = new Map<string, { entityId: string; entityName: string; office: PoliticalOffice }>();
  for (const politicalEntity of politicalEntities) {
    for (const office of politicalEntity.leadership ?? []) {
      officeByReference.set(`${politicalEntity.id}::${office.id}`, {
        entityId: politicalEntity.id,
        entityName: politicalEntity.name,
        office,
      });
    }
  }
  for (const office of offices) {
    officeByReference.set(`${entityId}::${office.id}`, {
      entityId,
      entityName: typeof entity.name === "string" ? entity.name : "This location",
      office,
    });
  }

  const hasGovernmentInfo =
    (typeof entity.government_type === "string" && entity.government_type.trim()) ||
    (typeof entity.government_notes === "string" && entity.government_notes.trim());

  if (offices.length === 0 && !hasGovernmentInfo) {
    if (typeof entity.ruler === "string" && entity.ruler) {
      return (
        <DetailSection title="Political leadership" icon={<AccountTreeIcon />}>
          <Typography variant="caption" color="text.secondary">
            Legacy ruler reference
          </Typography>
          <EntityReferenceLink
            entityId={entity.ruler}
            onOpenEntity={onOpenEntity}
            getEntity={getEntity}
          />
        </DetailSection>
      );
    }
    return null;
  }

  const hasLocalParent = (office: PoliticalOffice) =>
    asReferences(office.reports_to).some((reference) =>
      reference.entity_id === entityId && offices.some((candidate) => candidate.id === reference.office_id),
    );
  const rendered = new Set<string>();

  const renderOffice = (office: PoliticalOffice, path: Set<string>): ReactNode => {
    if (path.has(office.id) || rendered.has(office.id)) return null;
    rendered.add(office.id);
    const nextPath = new Set(path).add(office.id);
    const holders = Array.isArray(office.holders) ? office.holders : [];
    const references = asReferences(office.reports_to);
    const children = offices.filter((candidate) =>
      asReferences(candidate.reports_to).some((reference) =>
        reference.entity_id === entityId && reference.office_id === office.id,
      ),
    );

    return (
      <Box key={office.id} sx={{ ml: path.size ? 2.5 : 0, pl: path.size ? 2 : 0, borderLeft: path.size ? 1 : 0, borderColor: "divider" }}>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{office.title}</Typography>
              {typeof office.status === "string" && office.status.trim() && (
                <Chip size="small" label={office.status} />
              )}
            </Stack>
            {holders.length > 0 && (
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">Held by</Typography>
                {holders.map((holderId) => {
                  const holder = getEntity(holderId);
                  return (
                    <Chip
                      key={holderId}
                      size="small"
                      label={holder?.name ?? holderId}
                      onClick={holder && onOpenEntity ? () => onOpenEntity(holderId) : undefined}
                      clickable={Boolean(holder && onOpenEntity)}
                    />
                  );
                })}
              </Stack>
            )}
            {references.length > 0 && (
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">Reports to</Typography>
                {references.map((reference) => {
                  const target = officeByReference.get(`${reference.entity_id}::${reference.office_id}`);
                  const targetName = getEntity(reference.entity_id)?.name ?? target?.entityName ?? reference.entity_id;
                  const label = target ? `${target.office.title} · ${targetName}` : `Missing office · ${targetName}`;
                  return (
                    <Chip
                      key={`${reference.entity_id}::${reference.office_id}`}
                      size="small"
                      variant="outlined"
                      label={label}
                      onClick={onOpenEntity ? () => onOpenEntity(reference.entity_id) : undefined}
                      clickable={Boolean(onOpenEntity)}
                    />
                  );
                })}
              </Stack>
            )}
            {typeof office.authority === "string" && office.authority.trim() && (
              <Typography variant="body2">{office.authority}</Typography>
            )}
            {typeof office.notes === "string" && office.notes.trim() && (
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                {office.notes}
              </Typography>
            )}
          </Stack>
        </Paper>
        {children.length > 0 && (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {children.map((child) => renderOffice(child, nextPath))}
          </Stack>
        )}
      </Box>
    );
  };

  const rootOffices = offices.filter((office) => !hasLocalParent(office));
  const rootNodes = rootOffices.map((office) => renderOffice(office, new Set()));
  const unvisited = offices.filter((office) => !rendered.has(office.id));
  const unvisitedNodes = unvisited.map((office) => renderOffice(office, new Set()));
  const governmentType = typeof entity.government_type === "string" ? entity.government_type : "";
  const governmentNotes = typeof entity.government_notes === "string" ? entity.government_notes : "";

  return (
    <DetailSection title="Political leadership" icon={<AccountTreeIcon />}>
      {governmentType && (
        <Typography variant="subtitle2" color="text.secondary">{governmentType}</Typography>
      )}
      {governmentNotes && (
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{governmentNotes}</Typography>
      )}
      {(governmentType || governmentNotes) && offices.length > 0 && <Divider />}
      {offices.length > 0 && (
        <Stack spacing={1.25}>
          {rootNodes}
          {unvisited.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                OTHER / CIRCULAR REPORTING LINKS
              </Typography>
              <Stack spacing={1}>{unvisitedNodes}</Stack>
            </Box>
          )}
        </Stack>
      )}
      {offices.length === 0 && typeof entity.ruler === "string" && entity.ruler && (
        <>
          <Typography variant="caption" color="text.secondary">Legacy ruler reference</Typography>
          <EntityReferenceLink entityId={entity.ruler} onOpenEntity={onOpenEntity} getEntity={getEntity} />
        </>
      )}
    </DetailSection>
  );
}

function DetailSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
        {icon}
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
      </Stack>
      <Stack spacing={1.5}>{children}</Stack>
    </Box>
  );
}

function EntityReferenceLink({
  entityId,
  onOpenEntity,
  getEntity,
}: {
  entityId: string;
  onOpenEntity?: (id: string) => void;
  getEntity: (id: string) => EntitySummary | undefined;
}) {
  const entity = getEntity(entityId);
  return (
    <Typography
      component="button"
      type="button"
      variant="body2"
      onClick={() => onOpenEntity?.(entityId)}
      disabled={!entity || !onOpenEntity}
      sx={{ p: 0, border: 0, textAlign: "left", color: "text.primary", background: "none", textDecoration: "underline", cursor: "pointer" }}
    >
      {entity?.name ?? entityId}
    </Typography>
  );
}

export default PoliticalLeadershipDetails;

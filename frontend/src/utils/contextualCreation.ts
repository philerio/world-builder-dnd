import type { EntityData } from "../types";

export type CreationContext = {
  key: string;
  title: string;
  description: string;
  entityType: string;
  initialData: Record<string, unknown>;
  allowedTypes?: string[];
  submitLabel: string;
  link: (entity: EntityData) => Promise<void>;
};

export async function createAndLinkEntity(options: {
  existing: EntityData | null;
  entityType: string;
  data: Record<string, unknown>;
  create: (type: string, data: Record<string, unknown>) => Promise<EntityData>;
  rememberCreated: (entity: EntityData) => void;
  link?: (entity: EntityData) => Promise<void>;
}): Promise<EntityData> {
  const entity = options.existing ?? await options.create(options.entityType, options.data);
  // Remember creation before linking: a failed link can be retried without duplicates.
  options.rememberCreated(entity);
  await options.link?.(entity);
  return entity;
}

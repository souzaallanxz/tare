export type EntityKind = "job" | "cluster" | "warehouse" | "pipeline" | "notebook";

export type AttributionSource =
  | "tag"
  | "run_as"
  | "creator"
  | "query_user"
  | "manual"
  | "warehouse_id";

export type Entity = {
  readonly id: string;
  readonly tenantId: string;
  readonly kind: EntityKind;
  readonly externalId: string;
  readonly name: string;
  readonly firstSeen: string;
  readonly lastSeen: string;
};

export type Owner = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly kind: "team" | "person";
};

export type EntityOwner = {
  readonly tenantId: string;
  readonly entityId: string;
  readonly ownerId: string | null;
  readonly source: AttributionSource | null;
  readonly resolvedAt: string;
};

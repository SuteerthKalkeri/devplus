export type Account = { id: string; name: string; email: string };
export type Workspace = { id: string; name: string; slug: string; role: string };
export type Project = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt: string;
};
export type IngestionKey = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  revokedAt: string | null;
};

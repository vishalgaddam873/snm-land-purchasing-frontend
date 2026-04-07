export type LandStatus = "pending" | "approved" | "rejected";

export type LandRecord = {
  id: string;
  location: string;
  owner: string;
  areaAcres: number;
  priceInr: number;
  status: LandStatus;
  updatedAt: string;
};

export type ActivityItem = {
  id: string;
  action: string;
  detail: string;
  actor: string;
  at: string;
};

export type OwnerRecord = {
  id: string;
  name: string;
  contact: string;
  landsCount: number;
  location: string;
};

export type DocumentItem = {
  id: string;
  name: string;
  landId: string;
  type: string;
  uploadedAt: string;
  sizeKb: number;
};

export type ApprovalItem = {
  id: string;
  landId: string;
  title: string;
  submittedBy: string;
  submittedAt: string;
  status: LandStatus;
};

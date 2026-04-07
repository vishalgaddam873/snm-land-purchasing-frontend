import type {
  ActivityItem,
  ApprovalItem,
  DocumentItem,
  LandRecord,
  OwnerRecord,
} from "./types";

export const dashboardStats = {
  totalLands: 128,
  approvedLands: 94,
  pendingApprovals: 18,
  totalInvestmentInr: 47_250_000,
};

export const landRecords: LandRecord[] = [
  {
    id: "LND-1042",
    location: "Rohtak, Haryana",
    owner: "Shri Balbir Singh",
    areaAcres: 2.4,
    priceInr: 3_200_000,
    status: "approved",
    updatedAt: "2026-04-02",
  },
  {
    id: "LND-1043",
    location: "Mohali, Punjab",
    owner: "Smt. Harpreet Kaur",
    areaAcres: 1.1,
    priceInr: 4_850_000,
    status: "pending",
    updatedAt: "2026-04-03",
  },
  {
    id: "LND-1044",
    location: "Ghaziabad, UP",
    owner: "Shri Ramesh Verma",
    areaAcres: 3.0,
    priceInr: 6_100_000,
    status: "pending",
    updatedAt: "2026-04-04",
  },
  {
    id: "LND-1045",
    location: "Indore, MP",
    owner: "Shri Vikas Patil",
    areaAcres: 0.85,
    priceInr: 2_400_000,
    status: "rejected",
    updatedAt: "2026-03-28",
  },
  {
    id: "LND-1046",
    location: "Jaipur, Rajasthan",
    owner: "Smt. Meera Joshi",
    areaAcres: 5.2,
    priceInr: 8_900_000,
    status: "approved",
    updatedAt: "2026-04-01",
  },
  {
    id: "LND-1047",
    location: "Nashik, Maharashtra",
    owner: "Shri Sunil More",
    areaAcres: 1.75,
    priceInr: 3_650_000,
    status: "approved",
    updatedAt: "2026-03-30",
  },
];

export const recentActivity: ActivityItem[] = [
  {
    id: "a1",
    action: "Record updated",
    detail: "LND-1043 — boundary sketch attached",
    actor: "Dept. Coordinator",
    at: "2026-04-05 10:12",
  },
  {
    id: "a2",
    action: "Approval granted",
    detail: "LND-1042 — final verification complete",
    actor: "Regional Review",
    at: "2026-04-04 16:40",
  },
  {
    id: "a3",
    action: "New submission",
    detail: "LND-1044 — awaiting document check",
    actor: "Field Officer",
    at: "2026-04-04 09:05",
  },
  {
    id: "a4",
    action: "Note added",
    detail: "LND-1045 — owner contacted for clarification",
    actor: "Support Desk",
    at: "2026-04-03 14:22",
  },
];

export const owners: OwnerRecord[] = [
  {
    id: "OWN-201",
    name: "Shri Balbir Singh",
    contact: "+91 98100 11223",
    landsCount: 2,
    location: "Haryana",
  },
  {
    id: "OWN-202",
    name: "Smt. Harpreet Kaur",
    contact: "+91 98765 44556",
    landsCount: 1,
    location: "Punjab",
  },
  {
    id: "OWN-203",
    name: "Shri Ramesh Verma",
    contact: "+91 91234 77889",
    landsCount: 1,
    location: "Uttar Pradesh",
  },
];

export const documents: DocumentItem[] = [
  {
    id: "DOC-501",
    name: "Sale-deed-draft-LND-1042.pdf",
    landId: "LND-1042",
    type: "Legal",
    uploadedAt: "2026-04-01",
    sizeKb: 420,
  },
  {
    id: "DOC-502",
    name: "Survey-map-LND-1043.png",
    landId: "LND-1043",
    type: "Survey",
    uploadedAt: "2026-04-03",
    sizeKb: 890,
  },
  {
    id: "DOC-503",
    name: "Owner-ID-LND-1044.pdf",
    landId: "LND-1044",
    type: "Identity",
    uploadedAt: "2026-04-04",
    sizeKb: 210,
  },
];

export const approvals: ApprovalItem[] = [
  {
    id: "APR-01",
    landId: "LND-1043",
    title: "Purchase intent — Mohali parcel",
    submittedBy: "Field Officer (North)",
    submittedAt: "2026-04-03",
    status: "pending",
  },
  {
    id: "APR-02",
    landId: "LND-1044",
    title: "Title verification — Ghaziabad",
    submittedBy: "Legal Desk",
    submittedAt: "2026-04-04",
    status: "pending",
  },
  {
    id: "APR-03",
    landId: "LND-1042",
    title: "Final release — Rohtak",
    submittedBy: "Regional Head",
    submittedAt: "2026-04-02",
    status: "approved",
  },
];

"use client";

import { BranchesStoreProvider } from "@/components/branches/branches-store-provider";

export function BranchesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BranchesStoreProvider>{children}</BranchesStoreProvider>;
}

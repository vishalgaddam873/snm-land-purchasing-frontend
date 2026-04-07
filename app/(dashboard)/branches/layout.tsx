import { BranchesLayoutClient } from "./branches-layout-client";

/**
 * Keeps the branches Redux store mounted across /branches/* routes so list
 * filters and pagination survive navigation (e.g. future detail pages).
 */
export default function BranchesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BranchesLayoutClient>{children}</BranchesLayoutClient>;
}

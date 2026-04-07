"use client";

import { PropertiesStoreProvider } from "@/components/properties/properties-store-provider";

export function PropertiesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PropertiesStoreProvider>{children}</PropertiesStoreProvider>;
}

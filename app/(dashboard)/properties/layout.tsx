import { PropertiesLayoutClient } from "./properties-layout-client";

/**
 * Keeps the properties Redux store mounted while navigating between the list,
 * detail, edit, and new routes so list filters and pagination survive back navigation.
 */
export default function PropertiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PropertiesLayoutClient>{children}</PropertiesLayoutClient>;
}

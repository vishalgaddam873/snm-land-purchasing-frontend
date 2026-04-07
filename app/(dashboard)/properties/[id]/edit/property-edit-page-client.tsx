"use client";

import { PropertyFormPageClient } from "@/components/properties/property-form-page-client";
import type { PropertyRow } from "@/components/properties/property-helpers";

export function PropertyEditPageClient({
  property,
}: {
  property: PropertyRow;
}) {
  return <PropertyFormPageClient mode="edit" property={property} />;
}

"use client";

import { PropertyRemarksDisplay } from "@/components/properties/property-remarks-display";
import {
  bhawanLabel,
  branchNameOnly,
  constructionLabel,
  labelFromSnake,
  propertyTypeLabel,
  registrationLabel,
  verifiedByLabel,
  zoneNameLabel,
  zoneNumberLabel,
  type PropertyRow,
} from "@/components/properties/property-helpers";
import { Separator } from "@/components/ui/separator";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function formatVerifiedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function PropertyViewBody({
  property,
  showInternalNotes,
}: {
  property: PropertyRow;
  showInternalNotes: boolean;
}) {
  return (
    <div className="w-full space-y-8">
      <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          Zone & branch
        </h2>
        <Separator className="my-4" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Field label="Zone no.">{zoneNumberLabel(property)}</Field>
          <Field label="Zone">{zoneNameLabel(property)}</Field>
          <Field label="Branch">{branchNameOnly(property)}</Field>
          <Field label="Property type">
            {propertyTypeLabel(property.propertyType)}
          </Field>
          <Field label="Property details">{property.propertyName}</Field>
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          Land & structure
        </h2>
        <Separator className="my-4" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Area held">{property.areaHeld || "—"}</Field>
          <Field label="Located at">
            <span className="whitespace-pre-wrap">{property.locatedAt || "—"}</span>
          </Field>
          <Field label="Construction">
            {constructionLabel(property.constructionStatus)}
          </Field>
          <Field label="Bhawan type">
            {bhawanLabel(property.bhawanType)}
          </Field>
          <Field label="Registration">
            {registrationLabel(property.registrationType)}
          </Field>
        </div>
      </section>

      <section className="w-full rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Remarks</h2>
        <Separator className="my-4" />
        <PropertyRemarksDisplay remarks={property.remarks} />
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          Record & verification
        </h2>
        <Separator className="my-4" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Status">{labelFromSnake(property.status)}</Field>
          <Field label="Verification">
            {labelFromSnake(property.verificationStatus)}
          </Field>
          <Field label="Verified at">
            {formatVerifiedAt(property.verifiedAt)}
          </Field>
          <Field label="Verified by">{verifiedByLabel(property)}</Field>
        </div>
      </section>

      {showInternalNotes ? (
        <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">
            Internal notes
          </h2>
          <Separator className="my-4" />
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {property.internalNotes?.trim() || "—"}
          </p>
        </section>
      ) : null}
    </div>
  );
}

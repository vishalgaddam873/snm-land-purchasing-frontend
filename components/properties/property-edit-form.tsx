"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BranchSearchableSelect } from "@/components/properties/branch-searchable-select";
import {
  normalizeRemarksForSave,
  PropertyRemarksEditor,
} from "@/components/properties/property-remarks-editor";
import { Textarea } from "@/components/ui/textarea";
import {
  bhawanTypeAllowsVacantPlotStatus,
  branchIdValue,
  branchNameOnly,
  branchOptionId,
  sortBranchesForSelect,
  type BranchOption,
  type PropertyRow,
} from "@/components/properties/property-helpers";
import * as React from "react";

const selectClass =
  "flex h-10 w-full min-w-0 rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

const field = "min-w-0 space-y-1.5";

type PropertyEditFormProps = {
  mode: "create" | "edit";
  property?: PropertyRow;
  branches: BranchOption[];
  showInternalNotes: boolean;
  /** Status + verification (edit only, superadmin). */
  showStatusVerification: boolean;
  /** After create, passes new document id when present in API response. */
  onSuccess: (payload?: { _id: string }) => void;
  onCancel: () => void;
  /** Optional — page header actions aligned right */
  className?: string;
};

export function PropertyEditForm({
  mode,
  property,
  branches,
  showInternalNotes,
  showStatusVerification,
  onSuccess,
  onCancel,
  className,
}: PropertyEditFormProps) {
  const [branchId, setBranchId] = React.useState(
    property ? branchIdValue(property) : "",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [remarksHtml, setRemarksHtml] = React.useState(
    property?.remarks ?? "",
  );
  const [bhawanType, setBhawanType] = React.useState(
    property?.bhawanType ?? "bhawan",
  );

  const sorted = React.useMemo(
    () => sortBranchesForSelect(branches),
    [branches],
  );

  const selectedBranchName = React.useMemo(() => {
    if (!branchId) return null;
    const fromList = sorted.find((b) => branchOptionId(b) === branchId)?.name;
    if (fromList) return fromList;
    if (mode === "edit" && property) {
      const fromProp = branchNameOnly(property);
      if (fromProp && fromProp !== "—") return fromProp;
    }
    return null;
  }, [branchId, sorted, mode, property]);

  React.useEffect(() => {
    if (property) {
      setBranchId(branchIdValue(property));
      setBhawanType(property.bhawanType ?? "bhawan");
    } else if (mode === "create") {
      setBranchId("");
      setBhawanType("bhawan");
    }
  }, [property, mode]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const propertyName = String(form.get("propertyName") ?? "").trim();
    const areaHeld = String(form.get("areaHeld") ?? "").trim();
    const locatedAt = String(form.get("locatedAt") ?? "").trim();

    if (!branchId.trim()) {
      setError("Branch is required.");
      return;
    }
    if (!propertyName || !areaHeld || !locatedAt) {
      setError("Name, area held, and location are required.");
      return;
    }

    const bhawanTypeVal = String(form.get("bhawanType"));

    const body: Record<string, unknown> = {
      propertyName,
      branchId: branchId.trim(),
      propertyType: String(form.get("propertyType")),
      areaHeld,
      constructionStatus: String(form.get("constructionStatus")),
      locatedAt,
      bhawanType: bhawanTypeVal,
      remarks: normalizeRemarksForSave(remarksHtml),
      registrationType: String(form.get("registrationType")),
    };

    if (bhawanTypeAllowsVacantPlotStatus(bhawanTypeVal)) {
      const vps = String(form.get("vacantPlotStatus") ?? "").trim();
      body.vacantPlotStatus = vps.length ? vps : null;
    } else {
      body.vacantPlotStatus = null;
    }

    if (showInternalNotes) {
      body.internalNotes = String(form.get("internalNotes") ?? "").trim();
    }
    if (showStatusVerification && property) {
      body.status = String(form.get("status") ?? "active");
      body.verificationStatus = String(form.get("verificationStatus"));
    }

    setSaving(true);
    try {
      const url =
        mode === "edit" && property
          ? `/api/properties/${property._id}`
          : "/api/properties";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ?? "Save failed",
        );
        return;
      }
      if (mode === "edit" && property) {
        onSuccess();
      } else {
        const raw = data as { _id?: unknown };
        const id =
          raw?._id != null && String(raw._id) !== ""
            ? String(raw._id)
            : undefined;
        onSuccess(id ? { _id: id } : undefined);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      key={property?._id ?? "new"}
      className={
        className ??
        "w-full max-w-none space-y-6 text-[15px] leading-snug"
      }
      onSubmit={(e) => void onSubmit(e)}
    >
      <div className="flex flex-col-reverse gap-2 border-b border-border/60 pb-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" className="rounded-xl shadow-sm" disabled={saving}>
          {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Create"}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2 lg:grid-cols-6 lg:gap-y-4">
        <div className={`${field} md:col-span-2 lg:col-span-4`}>
          <Label htmlFor="propertyName" className="text-foreground">
            Property name
          </Label>
          <Input
            id="propertyName"
            name="propertyName"
            required
            defaultValue={property?.propertyName ?? ""}
            className="rounded-xl"
            placeholder="e.g. Plot No. 1 / sector centre"
          />
        </div>
        <div className={`${field} md:col-span-2 lg:col-span-2`}>
          <Label htmlFor="property-branchId" className="text-foreground">
            Branch
          </Label>
          <BranchSearchableSelect
            id="property-branchId"
            branches={sorted}
            disabled={saving}
            value={branchId}
            onChange={setBranchId}
            triggerLabel={
              selectedBranchName ??
              (branchId ? "Branch (loading list…)" : "Select branch")
            }
            triggerClassName="h-10 w-full min-w-0 rounded-xl border-input shadow-xs focus-visible:ring-[3px]"
            menuZIndexClass="z-[500]"
          />
        </div>

        <div className={`${field} md:col-span-1 lg:col-span-2`}>
          <Label htmlFor="propertyType" className="text-foreground">
            Property type
          </Label>
          <select
            id="propertyType"
            name="propertyType"
            className={selectClass}
            defaultValue={property?.propertyType ?? "main_branch"}
          >
            <option value="main_branch">Main branch</option>
            <option value="additional_unit">Additional unit</option>
            <option value="adjoining_plot">Adjoining plot</option>
          </select>
        </div>
        <div className={`${field} md:col-span-1 lg:col-span-2`}>
          <Label htmlFor="areaHeld" className="text-foreground">
            Area held
          </Label>
          <Input
            id="areaHeld"
            name="areaHeld"
            required
            defaultValue={property?.areaHeld ?? ""}
            className="rounded-xl"
            placeholder='e.g. 5440 Sq Yd'
          />
        </div>
        <div className={`${field} md:col-span-1 lg:col-span-2`}>
          <Label htmlFor="constructionStatus" className="text-foreground">
            Construction
          </Label>
          <select
            id="constructionStatus"
            name="constructionStatus"
            className={selectClass}
            defaultValue={property?.constructionStatus ?? "not_constructed"}
          >
            <option value="not_constructed">Not constructed</option>
            <option value="under_construction">Under construction</option>
            <option value="building">Building</option>
            <option value="constructed">Constructed</option>
          </select>
        </div>
        <div className={`${field} md:col-span-1 lg:col-span-3`}>
          <Label htmlFor="bhawanType" className="text-foreground">
            Bhawan type
          </Label>
          <select
            id="bhawanType"
            name="bhawanType"
            className={selectClass}
            value={bhawanType}
            onChange={(e) => setBhawanType(e.target.value)}
          >
            <option value="bhawan">Bhawan</option>
            <option value="bhawan_under_construction">
              Bhawan under construction
            </option>
            <option value="shed">Shed</option>
            <option value="self_made_shed">Self made shed</option>
            <option value="building">Building</option>
            <option value="no_bhavan_no_plot">No bhavan, no plot</option>
            <option value="vacant_plot">Vacant plot</option>
            <option value="na">NA</option>
          </select>
        </div>
        {bhawanTypeAllowsVacantPlotStatus(bhawanType) ? (
          <div className={`${field} md:col-span-1 lg:col-span-3`}>
            <Label htmlFor="vacantPlotStatus" className="text-foreground">
              Vacant plot status
            </Label>
            <select
              id="vacantPlotStatus"
              name="vacantPlotStatus"
              className={selectClass}
              defaultValue={property?.vacantPlotStatus ?? ""}
              key={`${property?._id ?? "new"}-vps-${bhawanType}`}
            >
              <option value="">Not set</option>
              <option value="fit_for_construction">Fit for Construction</option>
              <option value="fit_for_construction_later_stage">
                Fit for Construction at Later Stage
              </option>
              <option value="not_fit_for_construction">
                Not Fit for Construction
              </option>
            </select>
          </div>
        ) : null}
        <div className={`${field} md:col-span-1 lg:col-span-3`}>
          <Label htmlFor="registrationType" className="text-foreground">
            Registration
          </Label>
          <select
            id="registrationType"
            name="registrationType"
            className={selectClass}
            defaultValue={property?.registrationType ?? "to_be_registered"}
          >
            <option value="registered">Registered</option>
            <option value="to_be_registered">To be registered</option>
          </select>
        </div>

        <div className={`${field} md:col-span-2 lg:col-span-6`}>
          <Label htmlFor="locatedAt" className="text-foreground">
            Located at
          </Label>
          <Textarea
            id="locatedAt"
            name="locatedAt"
            required
            rows={2}
            defaultValue={property?.locatedAt ?? ""}
            className="min-h-[4.5rem] resize-y rounded-xl md:max-w-3xl"
          />
        </div>
      </div>

      <div className={`${field} w-full`}>
        <Label htmlFor="property-remarks-editor" className="text-foreground">
          Remarks
        </Label>
        <PropertyRemarksEditor
          key={property?._id ?? "create"}
          initialHtml={property?.remarks ?? ""}
          onChange={setRemarksHtml}
          disabled={saving}
        />
      </div>

      {showInternalNotes ? (
        <div className={`${field} w-full md:max-w-3xl`}>
          <Label htmlFor="internalNotes" className="text-foreground">
            Internal notes
          </Label>
          <Textarea
            id="internalNotes"
            name="internalNotes"
            rows={3}
            defaultValue={property?.internalNotes ?? ""}
            className="resize-y rounded-xl"
          />
        </div>
      ) : null}
      {showStatusVerification && property ? (
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 sm:max-w-xl">
          <div className={field}>
            <Label htmlFor="status" className="text-foreground">
              Record status
            </Label>
            <select
              id="status"
              name="status"
              className={selectClass}
              defaultValue={property.status}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className={field}>
            <Label htmlFor="verificationStatus" className="text-foreground">
              Verification
            </Label>
            <select
              id="verificationStatus"
              name="verificationStatus"
              className={selectClass}
              defaultValue={property.verificationStatus}
            >
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
            </select>
          </div>
        </div>
      ) : null}
    </form>
  );
}

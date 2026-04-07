"use client";

import { FileDropzone } from "@/components/forms/file-dropzone";
import { Stepper } from "@/components/forms/stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import * as React from "react";

const STEPS = [
  "Basic info",
  "Owner details",
  "Documents",
  "Review & submit",
];

export function AddLandForm() {
  const [step, setStep] = React.useState(1);

  return (
    <div className="space-y-8">
      <Stepper steps={STEPS} current={step} />

      {step === 1 && (
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Basic information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Working title</Label>
              <Input
                id="title"
                placeholder="e.g. North zone — Phase 2 parcel"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District / State</Label>
              <Input
                id="district"
                placeholder="District, State"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area (acres)</Label>
              <Input
                id="area"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder="Access road, water source, zoning context…"
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Owner details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner name</Label>
              <Input
                id="ownerName"
                placeholder="Full name"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerContact">Contact</Label>
              <Input
                id="ownerContact"
                placeholder="Phone number"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ownerAddress">Address</Label>
              <Textarea
                id="ownerAddress"
                rows={3}
                placeholder="Postal address"
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileDropzone />
            <p className="text-xs text-muted-foreground">
              Demo UI only — files are not uploaded. Connect your storage API
              when ready.
            </p>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Please confirm that basic details, owner information, and key
              documents are complete before submitting to the approval queue.
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Location and area verified on map / field visit</li>
              <li>Owner identity matches supporting documents</li>
              <li>Legal checklist shared with department reviewer</li>
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={step <= 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <div className="flex gap-2 sm:justify-end">
          {step < 4 ? (
            <Button
              type="button"
              className="rounded-xl shadow-sm"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" className="rounded-xl shadow-sm">
              <Send className="size-4" />
              Submit for approval
            </Button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Step {step} of {STEPS.length}
      </p>
    </div>
  );
}

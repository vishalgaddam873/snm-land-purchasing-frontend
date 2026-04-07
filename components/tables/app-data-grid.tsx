"use client";

import { DataGridThemeProvider } from "@/components/mui/data-grid-theme-provider";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import { cn } from "@/lib/utils";
import {
  DataGrid,
  type DataGridProps,
  type GridValidRowModel,
} from "@mui/x-data-grid";
import * as React from "react";

const defaultGridSx = {
  flex: 1,
  minHeight: 0,
  width: "100%",
  border: "none",
} as const;

export type AppDataGridProps<R extends GridValidRowModel = GridValidRowModel> =
  DataGridProps<R> & {
    noRowsLabel?: string;
    containerClassName?: string;
  };

/**
 * Shared MUI Data Grid shell (theme, card border, server pagination defaults)
 * used across list pages so tables look and behave consistently.
 */
export function AppDataGrid<R extends GridValidRowModel = GridValidRowModel>({
  noRowsLabel,
  containerClassName,
  sx,
  localeText,
  ...rest
}: AppDataGridProps<R>) {
  return (
    <DataGridThemeProvider>
      <div
        className={cn(
          "flex h-[min(62vh,30rem)] min-h-[22rem] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm",
          containerClassName,
        )}
      >
        <DataGrid<R>
          {...rest}
          paginationMode="server"
          pageSizeOptions={[DEFAULT_TABLE_PAGE_SIZE]}
          disableRowSelectionOnClick
          disableColumnSorting
          density="compact"
          sx={{ ...defaultGridSx, ...sx }}
          localeText={{
            noRowsLabel: noRowsLabel ?? "No rows.",
            ...localeText,
          }}
        />
      </div>
    </DataGridThemeProvider>
  );
}

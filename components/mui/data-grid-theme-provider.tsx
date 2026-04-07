"use client";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import * as React from "react";

/** Local theme so MUI X Data Grid matches the app’s light UI (see globals.css). */
const dataGridTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
    text: {
      primary: "#111827",
      secondary: "#6b7280",
    },
    primary: { main: "#7c3aed" },
    divider: "#e5e7eb",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    fontSize: 14,
  },
});

export function DataGridThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider theme={dataGridTheme}>{children}</ThemeProvider>;
}

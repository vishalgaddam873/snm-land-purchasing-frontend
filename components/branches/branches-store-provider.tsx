"use client";

import { makeStore } from "@/lib/store/store";
import { Provider } from "react-redux";
import * as React from "react";

export function BranchesStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [store] = React.useState(() => makeStore());
  return <Provider store={store}>{children}</Provider>;
}

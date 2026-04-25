"use client";

import {
  type AppModuleId,
  effectiveModuleLevel,
  type SessionUserLike,
  moduleAllowsEdit,
} from "@/lib/auth/module-access";
import * as React from "react";

type ModuleAccessContextValue = {
  user: SessionUserLike;
  ready: boolean;
  level: (moduleId: AppModuleId) => "edit" | "view" | "none";
  allowsEdit: (moduleId: AppModuleId) => boolean;
};

const ModuleAccessContext = React.createContext<ModuleAccessContextValue>({
  user: null,
  ready: false,
  level: () => "view",
  allowsEdit: () => false,
});

export function ModuleAccessProvider({
  user,
  ready,
  children,
}: {
  user: SessionUserLike;
  ready: boolean;
  children: React.ReactNode;
}) {
  const value = React.useMemo<ModuleAccessContextValue>(
    () => ({
      user,
      ready,
      level: (moduleId: AppModuleId) =>
        ready && user ? effectiveModuleLevel(user, moduleId) : "view",
      allowsEdit: (moduleId: AppModuleId) =>
        ready && user ? moduleAllowsEdit(user, moduleId) : false,
    }),
    [user, ready],
  );

  return (
    <ModuleAccessContext.Provider value={value}>
      {children}
    </ModuleAccessContext.Provider>
  );
}

export function useModuleAccess() {
  return React.useContext(ModuleAccessContext);
}

export function useModuleAllowsEdit(moduleId: AppModuleId): boolean {
  return useModuleAccess().allowsEdit(moduleId);
}

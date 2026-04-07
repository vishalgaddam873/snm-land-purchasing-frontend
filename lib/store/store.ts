import { configureStore } from "@reduxjs/toolkit";
import { branchesPageReducer } from "./features/branchesPageSlice";
import { propertiesPageReducer } from "./features/propertiesPageSlice";

export function makeStore() {
  return configureStore({
    reducer: {
      propertiesPage: propertiesPageReducer,
      branchesPage: branchesPageReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

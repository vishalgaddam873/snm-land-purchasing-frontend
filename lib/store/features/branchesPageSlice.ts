import type { DepartmentSelectOption } from "@/components/branches/department-searchable-select";
import type { ZoneSelectOption } from "@/components/branches/zone-searchable-select";
import {
  EMPTY_BRANCH_LIST_FILTERS,
  type BranchListFilterValues,
} from "@/components/branches/branches-filter-bar";
import {
  fetchActiveZonesForSelect,
  fetchDepartmentsForSelect,
} from "@/components/properties/property-helpers";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import { isPaginatedList } from "@/lib/api/paginated-list";
import type { PropertiesPageState } from "./propertiesPageSlice";
import {
  createAsyncThunk,
  createSlice,
  type AnyAction,
  type PayloadAction,
  type ThunkDispatch,
} from "@reduxjs/toolkit";

type PopulatedDepartment = { _id: string; name: string; code: string };

type PopulatedZone = {
  _id: string;
  name: string;
  zoneNumber: string;
  departmentId?: PopulatedDepartment | string;
};

type PopulatedSector = { _id: string; name: string; sectorNumber?: string };

export type BranchRow = {
  _id: string;
  name: string;
  zoneId: PopulatedZone | string;
  sectorId?: PopulatedSector | string | null;
  status: "active" | "inactive" | "deleted";
};

export type BranchListMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type BranchesPageState = {
  loading: boolean;
  rows: BranchRow[];
  error: string | null;
  listPage: number;
  listMeta: BranchListMeta | null;
  searchInput: string;
  debouncedSearch: string;
  appliedFilters: BranchListFilterValues;
  zones: ZoneSelectOption[];
  zonesLoading: boolean;
  zonesFetchError: string | null;
  departments: DepartmentSelectOption[];
  departmentsLoading: boolean;
  departmentsFetchError: string | null;
  deleteLoading: boolean;
};

const initialState: BranchesPageState = {
  loading: true,
  rows: [],
  error: null,
  listPage: 1,
  listMeta: null,
  searchInput: "",
  debouncedSearch: "",
  appliedFilters: { ...EMPTY_BRANCH_LIST_FILTERS },
  zones: [],
  zonesLoading: true,
  zonesFetchError: null,
  departments: [],
  departmentsLoading: true,
  departmentsFetchError: null,
  deleteLoading: false,
};

function appendBranchListFilters(
  qs: URLSearchParams,
  fv: BranchListFilterValues,
) {
  if (fv.departmentId) qs.set("departmentId", fv.departmentId);
  if (fv.zoneId) qs.set("zoneId", fv.zoneId);
  if (fv.sectorId) qs.set("sectorId", fv.sectorId);
  if (fv.status) qs.set("status", fv.status);
}

/** Matches `RootState` from `makeStore` for typed thunks. */
type AppThunkRoot = {
  propertiesPage: PropertiesPageState;
  branchesPage: BranchesPageState;
};

type BranchesPageDispatch = ThunkDispatch<AppThunkRoot, unknown, AnyAction>;

export const fetchBranchesList = createAsyncThunk<
  { data: BranchRow[]; meta: BranchListMeta } | null,
  void,
  { state: AppThunkRoot; rejectValue: string }
>("branchesPage/fetchList", async (_, { getState, rejectWithValue }) => {
  const { listPage, debouncedSearch, appliedFilters } =
    getState().branchesPage;
  const qs = new URLSearchParams({
    page: String(listPage),
    limit: String(DEFAULT_TABLE_PAGE_SIZE),
  });
  if (debouncedSearch) qs.set("search", debouncedSearch);
  appendBranchListFilters(qs, appliedFilters);
  const res = await fetch(`/api/branches?${qs}`, { cache: "no-store" });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data &&
      typeof data === "object" &&
      "message" in data &&
      (data as { message?: unknown }).message != null
        ? Array.isArray((data as { message: string[] }).message)
          ? (data as { message: string[] }).message.join(", ")
          : String((data as { message: string }).message)
        : "Failed to load branches";
    return rejectWithValue(msg);
  }
  if (!isPaginatedList<BranchRow>(data)) {
    return rejectWithValue("Invalid branches response");
  }
  return { data: data.data, meta: data.meta };
});

export const loadBranchesFilterOptions = createAsyncThunk(
  "branchesPage/loadFilterOptions",
  async () => {
    const [zo, de] = await Promise.allSettled([
      fetchActiveZonesForSelect(),
      fetchDepartmentsForSelect(),
    ]);
    return {
      zones: zo.status === "fulfilled" ? zo.value : [],
      zonesFetchError: zo.status === "rejected",
      departments: de.status === "fulfilled" ? de.value : [],
      departmentsFetchError: de.status === "rejected",
    };
  },
);

export const deleteBranchOnServer = createAsyncThunk<
  void,
  string,
  {
    state: AppThunkRoot;
    dispatch: BranchesPageDispatch;
    rejectValue: string;
  }
>("branchesPage/delete", async (id, { dispatch, rejectWithValue }) => {
  const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data &&
      typeof data === "object" &&
      "message" in data &&
      (data as { message?: unknown }).message != null
        ? String((data as { message: string }).message)
        : "Delete failed";
    return rejectWithValue(msg);
  }
  await dispatch(fetchBranchesList());
});

const branchesPageSlice = createSlice({
  name: "branchesPage",
  initialState,
  reducers: {
    setSearchInput(state, action: PayloadAction<string>) {
      state.searchInput = action.payload;
    },
    setDebouncedSearch(state, action: PayloadAction<string>) {
      state.debouncedSearch = action.payload;
    },
    setListPage(state, action: PayloadAction<number>) {
      state.listPage = action.payload;
    },
    applyBranchFilters(state, action: PayloadAction<BranchListFilterValues>) {
      state.appliedFilters = action.payload;
      state.listPage = 1;
    },
    clearAllBranchListFilters(state) {
      state.searchInput = "";
      state.debouncedSearch = "";
      state.appliedFilters = { ...EMPTY_BRANCH_LIST_FILTERS };
      state.listPage = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranchesList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranchesList.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.rows = action.payload.data;
          state.listMeta = action.payload.meta;
          state.listPage = action.payload.meta.page;
        }
      })
      .addCase(fetchBranchesList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to load branches";
        state.rows = [];
        state.listMeta = null;
      })
      .addCase(loadBranchesFilterOptions.pending, (state) => {
        state.zonesLoading = true;
        state.departmentsLoading = true;
        state.zonesFetchError = null;
        state.departmentsFetchError = null;
      })
      .addCase(loadBranchesFilterOptions.fulfilled, (state, action) => {
        state.zonesLoading = false;
        state.departmentsLoading = false;
        state.zones = action.payload.zones;
        state.departments = action.payload.departments;
        state.zonesFetchError = action.payload.zonesFetchError
          ? "Could not load zones."
          : null;
        state.departmentsFetchError = action.payload.departmentsFetchError
          ? "Could not load departments."
          : null;
      })
      .addCase(deleteBranchOnServer.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteBranchOnServer.fulfilled, (state) => {
        state.deleteLoading = false;
      })
      .addCase(deleteBranchOnServer.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload ?? "Delete failed";
      });
  },
});

export const {
  setSearchInput,
  setDebouncedSearch,
  setListPage,
  applyBranchFilters,
  clearAllBranchListFilters,
} = branchesPageSlice.actions;

export const branchesPageReducer = branchesPageSlice.reducer;

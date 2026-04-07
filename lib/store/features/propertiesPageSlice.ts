import type { DepartmentSelectOption } from "@/components/branches/department-searchable-select";
import type { ZoneSelectOption } from "@/components/branches/zone-searchable-select";
import {
  EMPTY_PROPERTY_LIST_FILTERS,
  type PropertyListFilterValues,
} from "@/components/properties/properties-filter-bar";
import type { BranchOption, PropertyRow } from "@/components/properties/property-helpers";
import {
  fetchActiveZonesForSelect,
  fetchBranchesForSelect,
  fetchDepartmentsForSelect,
} from "@/components/properties/property-helpers";
import { isPaginatedList } from "@/lib/api/paginated-list";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import {
  createAsyncThunk,
  createSlice,
  type AnyAction,
  type PayloadAction,
  type ThunkDispatch,
} from "@reduxjs/toolkit";

export type PropertyListMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PropertiesPageState = {
  loading: boolean;
  rows: PropertyRow[];
  error: string | null;
  listPage: number;
  listMeta: PropertyListMeta | null;
  searchInput: string;
  debouncedSearch: string;
  appliedFilters: PropertyListFilterValues;
  branches: BranchOption[];
  branchesLoading: boolean;
  branchesFetchError: string | null;
  zones: ZoneSelectOption[];
  zonesLoading: boolean;
  zonesFetchError: string | null;
  departments: DepartmentSelectOption[];
  departmentsLoading: boolean;
  departmentsFetchError: string | null;
  toDelete: PropertyRow | null;
  deleteLoading: boolean;
  exportLoading: boolean;
};

const initialState: PropertiesPageState = {
  loading: true,
  rows: [],
  error: null,
  listPage: 1,
  listMeta: null,
  searchInput: "",
  debouncedSearch: "",
  appliedFilters: { ...EMPTY_PROPERTY_LIST_FILTERS },
  branches: [],
  branchesLoading: true,
  branchesFetchError: null,
  zones: [],
  zonesLoading: true,
  zonesFetchError: null,
  departments: [],
  departmentsLoading: true,
  departmentsFetchError: null,
  toDelete: null,
  deleteLoading: false,
  exportLoading: false,
};

function appendListFilters(qs: URLSearchParams, fv: PropertyListFilterValues) {
  if (fv.departmentId) qs.set("departmentId", fv.departmentId);
  if (fv.zoneId) qs.set("zoneId", fv.zoneId);
  if (fv.sectorId) qs.set("sectorId", fv.sectorId);
  if (fv.branchId) qs.set("branchId", fv.branchId);
  fv.propertyTypes.forEach((v) => qs.append("propertyType", v));
  fv.statuses.forEach((v) => qs.append("status", v));
  fv.verificationStatuses.forEach((v) => qs.append("verificationStatus", v));
  fv.registrationTypes.forEach((v) => qs.append("registrationType", v));
  fv.constructionStatuses.forEach((v) => qs.append("constructionStatus", v));
  fv.bhawanTypes.forEach((v) => qs.append("bhawanType", v));
}

type PageRoot = { propertiesPage: PropertiesPageState };

type PropertiesPageDispatch = ThunkDispatch<PageRoot, unknown, AnyAction>;

export const fetchPropertiesList = createAsyncThunk<
  { data: PropertyRow[]; meta: PropertyListMeta } | null,
  void,
  { state: PageRoot; rejectValue: string }
>("propertiesPage/fetchList", async (_, { getState, rejectWithValue }) => {
  const { listPage, debouncedSearch, appliedFilters } =
    getState().propertiesPage;
  const qs = new URLSearchParams({
    page: String(listPage),
    limit: String(DEFAULT_TABLE_PAGE_SIZE),
  });
  if (debouncedSearch) qs.set("search", debouncedSearch);
  appendListFilters(qs, appliedFilters);
  const res = await fetch(`/api/properties?${qs}`, { cache: "no-store" });
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
        : "Failed to load properties";
    return rejectWithValue(msg);
  }
  if (!isPaginatedList<PropertyRow>(data)) {
    return rejectWithValue("Invalid properties response");
  }
  return { data: data.data, meta: data.meta };
});

export const loadPropertiesFilterOptions = createAsyncThunk(
  "propertiesPage/loadFilterOptions",
  async () => {
    const [br, zo, de] = await Promise.allSettled([
      fetchBranchesForSelect(),
      fetchActiveZonesForSelect(),
      fetchDepartmentsForSelect(),
    ]);
    return {
      branches: br.status === "fulfilled" ? br.value : [],
      branchesFetchError: br.status === "rejected",
      zones: zo.status === "fulfilled" ? zo.value : [],
      zonesFetchError: zo.status === "rejected",
      departments: de.status === "fulfilled" ? de.value : [],
      departmentsFetchError: de.status === "rejected",
    };
  },
);

export const deletePropertyOnServer = createAsyncThunk<
  void,
  string,
  {
    state: PageRoot;
    dispatch: PropertiesPageDispatch;
    rejectValue: string;
  }
>("propertiesPage/delete", async (id, { dispatch, rejectWithValue }) => {
  const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
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
  await dispatch(fetchPropertiesList());
});

function buildExportQuery(search: string, fv: PropertyListFilterValues): string {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  appendListFilters(qs, fv);
  return qs.toString();
}

function isUnfilteredPropertyExport(
  search: string,
  fv: PropertyListFilterValues,
): boolean {
  if (search.trim()) return false;
  if (fv.departmentId.trim()) return false;
  if (fv.zoneId.trim()) return false;
  if (fv.sectorId.trim()) return false;
  if (fv.branchId.trim()) return false;
  if (fv.propertyTypes.length) return false;
  if (fv.statuses.length) return false;
  if (fv.verificationStatuses.length) return false;
  if (fv.registrationTypes.length) return false;
  if (fv.constructionStatuses.length) return false;
  if (fv.bhawanTypes.length) return false;
  return true;
}

function filenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null;
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(
    cd,
  );
  if (!m) return null;
  const raw = (m[1] ?? m[2] ?? m[3] ?? "").trim();
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.replace(/"/g, ""));
  } catch {
    return raw.replace(/"/g, "");
  }
}

export const exportPropertiesExcel = createAsyncThunk<
  void,
  void,
  { state: PageRoot; rejectValue: string }
>("propertiesPage/exportExcel", async (_, { getState, rejectWithValue }) => {
  const { debouncedSearch, appliedFilters } = getState().propertiesPage;
  const q = buildExportQuery(debouncedSearch, appliedFilters);
  const url = q ? `/api/properties/export?${q}` : "/api/properties/export";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => ({}));
    const msg =
      data &&
      typeof data === "object" &&
      "message" in data &&
      (data as { message?: unknown }).message != null
        ? Array.isArray((data as { message: string[] }).message)
          ? (data as { message: string[] }).message.join(", ")
          : String((data as { message: string }).message)
        : "Export failed";
    return rejectWithValue(msg);
  }
  const blob = await res.blob();
  const fallback = isUnfilteredPropertyExport(debouncedSearch, appliedFilters)
    ? "Master-PP-Data.xlsx"
    : `properties-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const name =
    filenameFromContentDisposition(res.headers.get("content-disposition")) ??
    fallback;
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  URL.revokeObjectURL(href);
});

const propertiesPageSlice = createSlice({
  name: "propertiesPage",
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
    applyFilters(state, action: PayloadAction<PropertyListFilterValues>) {
      state.appliedFilters = action.payload;
      state.listPage = 1;
    },
    clearAllListFilters(state) {
      state.searchInput = "";
      state.debouncedSearch = "";
      state.appliedFilters = { ...EMPTY_PROPERTY_LIST_FILTERS };
      state.listPage = 1;
    },
    setToDelete(state, action: PayloadAction<PropertyRow | null>) {
      state.toDelete = action.payload;
    },
    clearListError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPropertiesList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPropertiesList.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.rows = action.payload.data;
          state.listMeta = action.payload.meta;
          state.listPage = action.payload.meta.page;
        }
      })
      .addCase(fetchPropertiesList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to load properties";
        state.rows = [];
        state.listMeta = null;
      })
      .addCase(loadPropertiesFilterOptions.pending, (state) => {
        state.branchesLoading = true;
        state.zonesLoading = true;
        state.departmentsLoading = true;
        state.branchesFetchError = null;
        state.zonesFetchError = null;
        state.departmentsFetchError = null;
      })
      .addCase(loadPropertiesFilterOptions.fulfilled, (state, action) => {
        state.branchesLoading = false;
        state.zonesLoading = false;
        state.departmentsLoading = false;
        state.branches = action.payload.branches;
        state.zones = action.payload.zones;
        state.departments = action.payload.departments;
        state.branchesFetchError = action.payload.branchesFetchError
          ? "Could not load branches."
          : null;
        state.zonesFetchError = action.payload.zonesFetchError
          ? "Could not load zones."
          : null;
        state.departmentsFetchError = action.payload.departmentsFetchError
          ? "Could not load departments."
          : null;
      })
      .addCase(deletePropertyOnServer.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deletePropertyOnServer.fulfilled, (state) => {
        state.deleteLoading = false;
        state.toDelete = null;
      })
      .addCase(deletePropertyOnServer.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload ?? "Delete failed";
      })
      .addCase(exportPropertiesExcel.pending, (state) => {
        state.exportLoading = true;
        state.error = null;
      })
      .addCase(exportPropertiesExcel.fulfilled, (state) => {
        state.exportLoading = false;
      })
      .addCase(exportPropertiesExcel.rejected, (state, action) => {
        state.exportLoading = false;
        state.error = action.payload ?? "Export failed";
      });
  },
});

export const {
  setSearchInput,
  setDebouncedSearch,
  setListPage,
  applyFilters,
  clearAllListFilters,
  setToDelete,
  clearListError,
} = propertiesPageSlice.actions;

export const propertiesPageReducer = propertiesPageSlice.reducer;

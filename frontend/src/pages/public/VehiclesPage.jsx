import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { vehiclesAPI, branchesAPI } from "../../api/endpoints";
import { formatCurrency } from "../../utils/format";
import { getApiErrorMessage } from "../../utils/apiError";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import toast from "react-hot-toast";

const VEHICLE_CATEGORIES = ["Premium", "Sport", "Business", "Électrique", "SUV", "Citadine"];
const SEARCH_DEBOUNCE_MS = 500;

const VehiclesPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("q") || "";
  const initialBranch = searchParams.get("branch") || "";
  const initialFrom = searchParams.get("from") || "";
  const initialTo = searchParams.get("to") || "";

  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ category: "", branch: initialBranch });
  const [dateFilters, setDateFilters] = useState({ from: initialFrom, to: initialTo });

  // `searchInput` updates on every keystroke for a responsive field, while
  // `appliedSearch` only changes once the user stopped typing (debounced),
  // which is what actually triggers a request.
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [appliedSearch, setAppliedSearch] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    fetchBranches();
  }, []);

  // Debounce settled: apply the term and go back to page 1 in a single batched
  // update so the fetch effect below runs only once.
  useEffect(() => {
    setAppliedSearch(debouncedSearch);
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [debouncedSearch]);

  // Reflect the applied search in the URL (shareable + survives a refresh).
  // `replace` avoids creating a history entry on every pause in typing.
  useEffect(() => {
    if ((searchParams.get("q") || "") === appliedSearch) return;
    const next = new URLSearchParams(searchParams);
    if (appliedSearch) next.set("q", appliedSearch);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  }, [appliedSearch, searchParams, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    fetchVehicles(controller.signal);
    return () => controller.abort();
  }, [filters.category, filters.branch, appliedSearch, pagination.page, dateFilters.from, dateFilters.to]);

  const fetchBranches = async () => {
    try {
      const res = await branchesAPI.getAll({ limit: 100 });
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVehicles = async (signal) => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };
      if (appliedSearch) params.search = appliedSearch;
      if (dateFilters.from) params.from = dateFilters.from;
      if (dateFilters.to) params.to = dateFilters.to;
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      const res = await vehiclesAPI.getAll(params, { signal });
      if (res.data.success) {
        setVehicles(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      // A superseded request was aborted on purpose: stay silent.
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      toast.error(getApiErrorMessage(err, t("vehicles.loadingError")));
      console.error(err);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setInitialized(true);
      }
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleReset = () => {
    setFilters({ category: "", branch: "" });
    setDateFilters({ from: "", to: "" });
    // Applied immediately (not through the debounce) to avoid a stale request.
    setSearchInput("");
    setAppliedSearch("");
    setSearchParams({}, { replace: true });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const isInitialLoading = loading && !initialized;
  const isRefetching = loading && initialized;
  const hasAvailabilityWindow = Boolean(dateFilters.from && dateFilters.to);

  return (
    <div className="min-h-screen bg-dark pt-24 pb-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-cairo font-bold mb-4">
            {t("vehicles.title")} <span className="text-accent">{t("vehicles.titleAccent")}</span>
          </h1>
          <p className="text-gray-400 font-cairo">{t("vehicles.subtitle")}</p>
        </div>

        {/* Filtres */}
        <div className="bg-dark-light/50 border border-white/10 rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">{t("vehicles.search")}</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-gray-500" aria-hidden="true">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t("vehicles.searchPlaceholder")}
                  className="w-full py-2 ps-9 pe-9 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                />
                <span className="absolute inset-y-0 end-3 flex items-center">
                  {isRefetching ? (
                    <span className="h-4 w-4 rounded-full border-2 border-accent/30 border-t-accent animate-spin" aria-hidden="true" />
                  ) : searchInput ? (
                    <button
                      type="button"
                      onClick={() => { setSearchInput(""); setAppliedSearch(""); }}
                      aria-label={t("vehicles.reset")}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : null}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">{t("vehicles.category")}</label>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
              >
                <option value="">{t("vehicles.all")}</option>
                {VEHICLE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">{t("vehicles.agency")}</label>
              <select
                name="branch"
                value={filters.branch}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
              >
                <option value="">{t("vehicles.all")}</option>
                {branches.map(branch => (
                  <option key={branch._id} value={branch._id}>{branch.name} ({branch.code})</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleReset}
                className="w-full py-2 border border-white/20 rounded-lg text-white hover:bg-white/5 transition-colors"
              >
                {t("vehicles.reset")}
              </button>
            </div>
          </div>
        </div>

        {/* Liste véhicules */}
        {isInitialLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">{t("vehicles.none")}</p>
          </div>
        ) : (
          <>
            {/* Liste véhicules — tableau responsive */}
            <div className={`bg-dark-light/50 border border-white/10 rounded-2xl overflow-hidden transition-opacity ${isRefetching ? "opacity-60" : ""}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">{t("vehicles.subtitle")}</caption>
                  <thead>
                    <tr className="border-b border-white/10 bg-white/2">
                      <th scope="col" className="text-start text-xs uppercase tracking-wider text-gray-400 font-medium px-5 py-4">
                        {t("vehicles.vehicle")}
                      </th>
                      <th scope="col" className="hidden sm:table-cell text-start text-xs uppercase tracking-wider text-gray-400 font-medium px-5 py-4">
                        {t("vehicles.category")}
                      </th>
                      <th scope="col" className="hidden md:table-cell text-start text-xs uppercase tracking-wider text-gray-400 font-medium px-5 py-4">
                        {t("vehicles.transmission")}
                      </th>
                      <th scope="col" className="hidden md:table-cell text-start text-xs uppercase tracking-wider text-gray-400 font-medium px-5 py-4">
                        {t("vehicles.seatsLabel")}
                      </th>
                      <th scope="col" className="hidden md:table-cell text-start text-xs uppercase tracking-wider text-gray-400 font-medium px-5 py-4">
                        {t("vehicles.fuel")}
                      </th>
                      <th scope="col" className="hidden xl:table-cell text-start text-xs uppercase tracking-wider text-gray-400 font-medium px-5 py-4">
                        {t("vehicles.agency")}
                      </th>
                      <th scope="col" className="text-end text-xs uppercase tracking-wider text-gray-400 font-medium px-5 py-4">
                        {t("vehicles.price")}
                      </th>
                      <th scope="col" className="text-end text-xs uppercase tracking-wider text-gray-400 font-medium px-5 py-4">
                        <span className="sr-only">{t("vehicles.bookNow")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((vehicle) => {
                      const branchId = typeof vehicle.branch === "object" ? vehicle.branch?._id : vehicle.branch;
                      const branch = branches.find((b) => b._id === branchId);
                      return (
                        <tr
                          key={vehicle._id}
                          className="border-b border-white/5 last:border-b-0 hover:bg-white/4 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3 min-w-0">
                              {vehicle.images?.[0] && (
                                <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden border border-white/15 bg-dark-light">
                                  <img
                                    src={vehicle.images[0]}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.opacity = "0";
                                    }}
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-cairo font-semibold truncate block">
                                  {vehicle.make} {vehicle.model}
                                </span>
                                <div className="text-xs text-gray-500 truncate md:hidden">
                                  {t(`admin.transmissions.${vehicle.transmission}`, vehicle.transmission)}
                                  {" • "}
                                  {t(`admin.fuelTypes.${vehicle.fuelType}`, vehicle.fuelType)}
                                  {" • "}
                                  {t("vehicles.seats", { count: vehicle.seats })}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-5 py-4">
                            <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-accent/15 text-accent border border-accent/25 whitespace-nowrap">
                              {t(`admin.categories.${vehicle.category}`, vehicle.category)}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-5 py-4 text-gray-300 whitespace-nowrap">
                            {t(`admin.transmissions.${vehicle.transmission}`, vehicle.transmission)}
                          </td>
                          <td className="hidden md:table-cell px-5 py-4 text-gray-300 whitespace-nowrap">
                            {vehicle.seats}
                          </td>
                          <td className="hidden md:table-cell px-5 py-4 text-gray-300 whitespace-nowrap">
                            {t(`admin.fuelTypes.${vehicle.fuelType}`, vehicle.fuelType)}
                          </td>
                          <td className="hidden xl:table-cell px-5 py-4 text-gray-300 whitespace-nowrap">
                            {branch ? branch.name : vehicle.location || "—"}
                          </td>
                          <td className="px-5 py-4 text-end whitespace-nowrap">
                            <span className="text-accent font-cairo font-bold">{formatCurrency(vehicle.dailyRateCents)}</span>
                            <span className="text-xs text-gray-400 ms-1">{t("vehicles.perDay")}</span>
                          </td>
                          <td className="px-5 py-4 text-end">
                            {(vehicle.available ?? (vehicle.status === "available")) ? (
                              <Link
                                to={`/vehicles/${vehicle._id}`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-accent text-dark hover:bg-accent-light transition-colors whitespace-nowrap"
                              >
                                {t("vehicles.bookNow")}
                                <svg className="w-3.5 h-3.5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </Link>
                            ) : (
                              // Not bookable: show the status instead of a CTA
                              // that would only ever fail at booking time.
                              <span className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-full bg-white/10 text-gray-300 whitespace-nowrap">
                                {hasAvailabilityWindow && vehicle.status === "available"
                                  ? t("vehicles.unavailableForDates", "Unavailable for selected dates")
                                  : t(`admin.statuses.${vehicle.status}`, vehicle.status)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-white/20 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5"
                >
                  {t("vehicles.previous")}
                </button>
                <span className="px-4 py-2 text-gray-400">
                  {t("vehicles.page", { page: pagination.page, pages: pagination.pages })}
                </span>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 border border-white/20 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5"
                >
                  {t("vehicles.next")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VehiclesPage;

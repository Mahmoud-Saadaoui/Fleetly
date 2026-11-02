import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { agentBookingsAPI, bookingsAPI, branchesAPI, vehiclesAPI } from "../../api/endpoints";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { getApiErrorMessage } from "../../utils/apiError";
import toast from "react-hot-toast";

const STATUSES = ["pending_payment", "confirmed", "active", "completed", "cancelled", "no_show"];

const BookingsList = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [branches, setBranches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ status: "", branchId: "", vehicleId: "", dateFrom: "", dateTo: "" });
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    Promise.all([branchesAPI.getAll({ limit: 100 }), vehiclesAPI.getAll({ limit: 100 })])
      .then(([br, ve]) => {
        if (br.data.success) setBranches(br.data.data);
        if (ve.data.success) setVehicles(ve.data.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters.status, filters.branchId, filters.vehicleId, filters.dateFrom, filters.dateTo]);

  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page: pagination.page, limit: pagination.limit, ...filters };
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });
      const res = await agentBookingsAPI.getAll(params);
      if (res.data.success) {
        setBookings(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t("admin.common.error")));
      toast.error(t("admin.common.error"));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    if (!status) return;
    setUpdatingId(id);
    try {
      await bookingsAPI.updateStatus(id, status);
      toast.success(t("admin.bookings.statusUpdated"));
      fetchBookings();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("admin.common.error")));
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && bookings.length === 0) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-cairo font-bold mb-2">{t("admin.bookings.title")}</h1>
        <p className="text-gray-400">{t("admin.bookings.subtitle")}</p>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <select
          value={filters.status}
          onChange={(e) => {
            setFilters((f) => ({ ...f, status: e.target.value }));
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="px-3 py-2 bg-dark border border-white/10 rounded-lg text-white"
        >
          <option value="">{t("admin.common.allStatus")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`bookings.status.${s}`, s)}</option>
          ))}
        </select>
        <select
          value={filters.branchId}
          onChange={(e) => {
            setFilters((f) => ({ ...f, branchId: e.target.value }));
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="px-3 py-2 bg-dark border border-white/10 rounded-lg text-white"
        >
          <option value="">{t("admin.common.allBranches")}</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
        <select
          value={filters.vehicleId}
          onChange={(e) => {
            setFilters((f) => ({ ...f, vehicleId: e.target.value }));
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="px-3 py-2 bg-dark border border-white/10 rounded-lg text-white"
        >
          <option value="">{t("admin.common.allVehicles")}</option>
          {vehicles.map((v) => (
            <option key={v._id} value={v._id}>{v.make} {v.model}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => {
            setFilters((f) => ({ ...f, dateFrom: e.target.value }));
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="px-3 py-2 bg-dark border border-white/10 rounded-lg text-white"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => {
            setFilters((f) => ({ ...f, dateTo: e.target.value }));
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="px-3 py-2 bg-dark border border-white/10 rounded-lg text-white"
        />
      </div>

      {error && <div className="mb-4 text-red-400">{error}</div>}
      {loading && bookings.length > 0 && <div className="mb-4 text-sm text-gray-400">{t("common.loading")}</div>}

      <div className="bg-dark-light/50 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.common.client")}</th>
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.common.vehicle")}</th>
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.common.dates")}</th>
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.common.amount")}</th>
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.common.status")}</th>
              <th className="text-right text-xs text-gray-400 p-4">{t("admin.actions.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-6 text-center text-gray-400">{t("admin.common.noResults")}</td>
              </tr>
            ) : bookings.map(b => (
              <tr key={b._id} className="border-b border-white/5">
                <td className="p-4 text-sm">{b.customer?.name || "-"}</td>
                <td className="p-4 text-sm">{b.vehicle?.make} {b.vehicle?.model}</td>
                <td className="p-4 text-sm text-gray-400">{formatDateTime(b.startAt)} → {formatDateTime(b.endAt)}</td>
                <td className="p-4 text-sm">{formatCurrency(b.pricing?.totalCents)}</td>
                <td className="p-4">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">
                    {t(`bookings.status.${b.status}`, b.status)}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <select onChange={(e) => updateStatus(b._id, e.target.value)} defaultValue="" disabled={updatingId === b._id} className="px-2 py-1 bg-white/5 border border-white/20 rounded text-xs disabled:opacity-50">
                    <option value="" disabled>{t("admin.actions.change")}</option>
                    {STATUSES.map(s => <option key={s} value={s}>{t(`bookings.status.${s}`, s)}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingsList;

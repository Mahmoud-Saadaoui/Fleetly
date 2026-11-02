import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { vehiclesAPI } from "../../api/endpoints";
import { formatCurrency } from "../../utils/format";
import { getApiErrorMessage } from "../../utils/apiError";
import toast from "react-hot-toast";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

const STATUSES = ["available", "reserved", "rented", "maintenance", "retired"];
const CATEGORIES = ["Premium", "Sport", "Business", "Électrique", "SUV", "Citadine"];

const VehiclesList = () => {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      const res = await vehiclesAPI.getAll(params);
      if (res.data.success) {
        setVehicles(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch {
      toast.error(t("admin.vehicles.loadingError"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t("admin.vehicles.deleteConfirm"))) return;
    setDeletingId(id);
    try {
      await vehiclesAPI.delete(id);
      toast.success(t("admin.vehicles.deleted"));
      fetchVehicles();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("admin.common.error")));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && vehicles.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-cairo font-bold mb-2">{t("admin.vehicles.title")}</h1>
          <p className="text-gray-400">{t("admin.vehicles.subtitle")}</p>
        </div>
        <Link
          to="/admin/vehicles/new"
          className="flex items-center gap-2 px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-light"
        >
          <FaPlus /> {t("admin.actions.add")}
        </Link>
      </div>

      <div className="bg-dark-light/50 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs text-gray-400 font-normal p-4">{t("admin.common.vehicle")}</th>
                <th className="text-left text-xs text-gray-400 font-normal p-4">{t("admin.vehicles.registration")}</th>
                <th className="text-left text-xs text-gray-400 font-normal p-4">{t("admin.vehicles.category")}</th>
                <th className="text-left text-xs text-gray-400 font-normal p-4">{t("admin.vehicles.ratePerDay")}</th>
                <th className="text-left text-xs text-gray-400 font-normal p-4">{t("admin.common.status")}</th>
                <th className="text-right text-xs text-gray-400 font-normal p-4">{t("admin.actions.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-gray-400">{t("admin.common.noResults")}</td>
                </tr>
              ) : vehicles.map((v) => (
                <tr key={v._id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <div className="font-medium">{v.make} {v.model}</div>
                    <div className="text-xs text-gray-400">
                      {t(`admin.transmissions.${v.transmission}`, v.transmission)} • {t(`admin.fuelTypes.${v.fuelType}`, v.fuelType)}
                    </div>
                  </td>
                  <td className="p-4 text-sm">{v.registrationNumber}</td>
                  <td className="p-4 text-sm">{t(`admin.categories.${v.category}`, v.category)}</td>
                  <td className="p-4 text-sm">{formatCurrency(v.dailyRateCents)}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">
                      {t(`admin.statuses.${v.status}`, v.status)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/vehicles/${v._id}/edit`} className="p-2 text-gray-400 hover:text-white">
                        <FaEdit />
                      </Link>
                      <button onClick={() => handleDelete(v._id)} disabled={deletingId === v._id} className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-50">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-white/20 rounded-lg disabled:opacity-50"
          >
            {t("admin.actions.previous")}
          </button>
          <span className="px-4 py-2 text-gray-400">{pagination.page}/{pagination.pages}</span>
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 border border-white/20 rounded-lg disabled:opacity-50"
          >
            {t("admin.actions.next")}
          </button>
        </div>
      )}
    </div>
  );
};

export default VehiclesList;

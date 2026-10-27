import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { analyticsAPI } from "../../api/endpoints";
import { formatCurrency, formatNumber } from "../../utils/format";
import toast from "react-hot-toast";

const AnalyticsPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await analyticsAPI.overview({ range: "90d" });
      if (res.data.success) setOverview(res.data.data);
    } catch {
      toast.error(t("admin.common.error"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-cairo font-bold mb-2">{t("admin.analytics.title")}</h1>
        <p className="text-gray-400">{t("admin.analytics.subtitle")}</p>
      </div>
      {overview && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-dark-light/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-sm text-gray-400 mb-2">{t("admin.analytics.revenue")}</h3>
            <p className="text-2xl font-bold">{formatCurrency(overview.revenueCents, overview.currency)}</p>
          </div>
          <div className="bg-dark-light/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-sm text-gray-400 mb-2">{t("admin.analytics.bookings")}</h3>
            <p className="text-2xl font-bold">{overview.bookings}</p>
          </div>
          <div className="bg-dark-light/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-sm text-gray-400 mb-2">{t("admin.analytics.occupancy")}</h3>
            <p className="text-2xl font-bold">{overview.occupancyRate}%</p>
          </div>
          <div className="bg-dark-light/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-sm text-gray-400 mb-2">{t("admin.analytics.fleetTotal")}</h3>
            <p className="text-2xl font-bold">{overview.fleetTotal}</p>
          </div>
          <div className="bg-dark-light/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-sm text-gray-400 mb-2">{t("admin.analytics.maintenance")}</h3>
            <p className="text-2xl font-bold">{overview.maintenanceFleet}</p>
          </div>
          <div className="bg-dark-light/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-sm text-gray-400 mb-2">{t("admin.analytics.rentedDays")}</h3>
            <p className="text-2xl font-bold">{formatNumber(overview.rentedDays)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;

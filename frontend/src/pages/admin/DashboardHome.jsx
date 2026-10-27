import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { analyticsAPI, agentBookingsAPI, vehiclesAPI, branchesAPI } from "../../api/endpoints";
import { useAuth } from "../../hooks/useAuth";
import { formatCurrency } from "../../utils/format";
import { FaCar, FaClipboardList, FaBuilding, FaEuroSign } from "react-icons/fa";

const DashboardHome = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, bookingsRes, vehiclesRes, branchesRes] = await Promise.allSettled([
        analyticsAPI.overview({ range: "30d" }),
        agentBookingsAPI.getAll({ limit: 5 }),
        vehiclesAPI.getAll({ limit: 1 }),
        branchesAPI.getAll({ limit: 1 }),
      ]);

      const newStats = {
        revenueCents: overviewRes.status === "fulfilled" ? overviewRes.value.data.data.revenueCents : 0,
        currency: overviewRes.status === "fulfilled" ? overviewRes.value.data.data.currency : "EUR",
        bookings: overviewRes.status === "fulfilled" ? overviewRes.value.data.data.bookings : 0,
        fleetTotal: overviewRes.status === "fulfilled" ? overviewRes.value.data.data.fleetTotal : 0,
        occupancyRate: overviewRes.status === "fulfilled" ? overviewRes.value.data.data.occupancyRate : 0,
        totalVehicles: vehiclesRes.status === "fulfilled" ? vehiclesRes.value.data.pagination?.total || 0 : 0,
        totalBranches: branchesRes.status === "fulfilled" ? branchesRes.value.data.pagination?.total || 0 : 0,
      };
      setStats(newStats);

      if (bookingsRes.status === "fulfilled") {
        setRecentBookings(bookingsRes.value.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { title: t("admin.dashboard.revenue30"), value: formatCurrency(stats?.revenueCents, stats?.currency), icon: FaEuroSign, color: "text-green-400" },
    { title: t("admin.dashboard.bookings30"), value: stats?.bookings || 0, icon: FaClipboardList, color: "text-blue-400" },
    { title: t("admin.dashboard.vehicles"), value: stats?.totalVehicles || 0, icon: FaCar, color: "text-accent" },
    { title: t("admin.dashboard.branches"), value: stats?.totalBranches || 0, icon: FaBuilding, color: "text-purple-400" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-cairo font-bold mb-2">{t("admin.dashboard.title")}</h1>
        <p className="text-gray-400">{t("admin.dashboard.welcome", { name: user?.name })}</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-dark-light/50 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Icon className={`text-2xl ${card.color}`} />
              </div>
              <h3 className="text-sm text-gray-400 mb-1">{card.title}</h3>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-dark-light/50 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-cairo font-semibold mb-6">{t("admin.dashboard.recentBookings")}</h2>
        {recentBookings.length === 0 ? (
          <p className="text-gray-400 text-sm">{t("admin.dashboard.noRecentBookings")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs text-gray-400 font-normal pb-3">{t("admin.common.client")}</th>
                  <th className="text-left text-xs text-gray-400 font-normal pb-3">{t("admin.common.vehicle")}</th>
                  <th className="text-left text-xs text-gray-400 font-normal pb-3">{t("admin.common.dates")}</th>
                  <th className="text-left text-xs text-gray-400 font-normal pb-3">{t("admin.common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking) => (
                  <tr key={booking._id} className="border-b border-white/5">
                    <td className="py-3 text-sm">{booking.customer?.name || "-"}</td>
                    <td className="py-3 text-sm">{booking.vehicle?.make} {booking.vehicle?.model}</td>
                    <td className="py-3 text-sm text-gray-400">{new Date(booking.startAt).toLocaleDateString(i18n.language)}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">
                        {t(`bookings.status.${booking.status}`, booking.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;

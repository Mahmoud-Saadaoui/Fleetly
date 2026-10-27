import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { bookingsAPI } from "../../api/endpoints";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { getApiErrorMessage } from "../../utils/apiError";
import toast from "react-hot-toast";

const STATUS_COLORS = {
  pending_payment: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  active: "bg-green-500/20 text-green-400",
  completed: "bg-gray-500/20 text-gray-400",
  cancelled: "bg-red-500/20 text-red-400",
  no_show: "bg-orange-500/20 text-orange-400",
};

const BookingsPage = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [filter, setFilter] = useState("all");
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, [pagination.page]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingsAPI.getMine({ page: pagination.page, limit: pagination.limit });
      if (res.data.success) {
        setBookings(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (status) => t(`bookings.status.${status}`);

  const canCancel = (booking) => {
    if (['completed', 'cancelled', 'no_show', 'active'].includes(booking.status)) return false;
    if (booking.status === 'confirmed' && booking.startAt) {
      return new Date(booking.startAt).getTime() - Date.now() >= 24 * 60 * 60 * 1000;
    }
    return booking.status === 'pending_payment';
  };

  const handleCancel = async (booking) => {
    const reason = window.prompt(t('bookings.cancelReasonPrompt') || 'Cancellation reason (optional)');
    if (reason === null) return;
    setCancellingId(booking._id);
    try {
      const res = await bookingsAPI.cancel(booking._id, { reason });
      if (res.data.success) {
        toast.success(res.data.message || t('bookings.cancelled'));
        fetchBookings();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('bookings.cancelError') || 'Failed to cancel booking'));
    } finally {
      setCancellingId(null);
    }
  };

  const filteredBookings =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="min-h-screen bg-dark px-6 pt-24 pb-16">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-cairo font-bold mb-4">
            {t("bookings.title")} <span className="text-accent">{t("bookings.titleAccent")}</span>
          </h1>
          <p className="text-gray-400 font-cairo">{t("bookings.subtitle")}</p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-8">
          {["all", "pending_payment", "confirmed", "active", "completed", "cancelled"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-cairo transition-colors ${
                filter === status
                  ? "bg-accent text-dark font-semibold"
                  : "border border-white/20 text-gray-300 hover:bg-white/5"
              }`}
            >
              {status === "all" ? t("bookings.all") : statusLabel(status)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">{t("bookings.none")}</div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking._id}
                className="bg-dark-light/50 border border-white/10 rounded-2xl p-6 hover:border-accent/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-cairo font-semibold">
                      {booking.vehicle?.make} {booking.vehicle?.model}
                    </h3>
                    <p className="text-sm text-gray-400">{booking.vehicle?.registrationNumber}</p>
                  </div>
                  <span className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[booking.status] || ""}`}>
                    {statusLabel(booking.status)}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 mb-1">{t("bookings.pickup")}</p>
                    <p>{formatDateTime(booking.startAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">{t("bookings.return")}</p>
                    <p>{formatDateTime(booking.endAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">{t("bookings.days")}</p>
                    <p>{booking.pricing?.rentalDays}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">{t("bookings.total")}</p>
                    <p className="text-accent font-semibold">{formatCurrency(booking.pricing?.totalCents)}</p>
                  </div>
                </div>
                {canCancel(booking) && (
                  <div className="mt-4">
                    <button
                      onClick={() => handleCancel(booking)}
                      disabled={cancellingId === booking._id}
                      className="px-4 py-2 text-sm rounded-lg border border-red-400/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {cancellingId === booking._id ? (t('common.loading') || '...') : (t('bookings.cancel') || 'Cancel')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("bookings.previous")}
            </button>
            <span className="text-gray-400 font-cairo">
              {t("bookings.page", { page: pagination.page, pages: pagination.pages })}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("bookings.next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsPage;

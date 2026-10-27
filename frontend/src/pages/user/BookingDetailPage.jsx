import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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

const BookingDetailPage = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const res = await bookingsAPI.getMineById(id);
      if (res.data.success) {
        setBooking(res.data.data);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("bookings.loadError") || "Failed to load booking"));
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (status) => t(`bookings.status.${status}`);

  const canCancel = (booking) => {
    if (!booking) return false;
    if (['completed', 'cancelled', 'no_show', 'active'].includes(booking.status)) return false;
    if (booking.status === 'confirmed' && booking.startAt) {
      return new Date(booking.startAt).getTime() - Date.now() >= 24 * 60 * 60 * 1000;
    }
    return booking.status === 'pending_payment';
  };

  const handleCancel = async () => {
    if (!booking) return;
    const reason = window.prompt(t('bookings.cancelReasonPrompt') || 'Cancellation reason (optional)');
    if (reason === null) return;
    setCancelling(true);
    try {
      const res = await bookingsAPI.cancel(booking._id, { reason });
      if (res.data.success) {
        toast.success(res.data.message || t('bookings.cancelled'));
        fetchBooking();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('bookings.cancelError') || 'Failed to cancel booking'));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark px-6 pt-24 pb-16 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-dark px-6 pt-24 pb-16">
        <div className="max-w-3xl mx-auto text-center text-gray-400">
          <p className="mb-4">{t("bookings.notFound") || "Booking not found"}</p>
          <Link to="/bookings" className="text-accent underline">{t("bookings.back") || "Back to bookings"}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark px-6 pt-24 pb-16">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-cairo font-bold mb-2">
              {t("bookings.detailTitle") || "Booking details"} <span className="text-accent">{booking.reference || booking._id?.slice(-8).toUpperCase()}</span>
            </h1>
            <p className="text-gray-400">{t("bookings.detailSubtitle") || "Your reservation information"}</p>
          </div>
          <button onClick={() => navigate(-1)} className="text-gray-300 hover:text-white">{t("common.back") || "Back"}</button>
        </div>

        <div className="bg-dark-light/50 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold">{booking.vehicle?.make} {booking.vehicle?.model}</h2>
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
              <p className="text-gray-400 mb-1">{t("bookings.pickupBranch") || "Pickup branch"}</p>
              <p>{booking.pickupBranch?.name || "-"}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">{t("bookings.returnBranch") || "Return branch"}</p>
              <p>{booking.returnBranch?.name || booking.pickupBranch?.name || "-"}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">{t("bookings.days")}</p>
              <p>{booking.pricing?.rentalDays}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">{t("bookings.total")}</p>
              <p className="text-accent font-semibold">{formatCurrency(booking.pricing?.totalCents, booking.pricing?.currency)}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">{t("bookings.paymentStatus") || "Payment status"}</p>
              <p>{t(`bookings.payment.${booking.paymentStatus}`) || booking.paymentStatus}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">{t("bookings.reference") || "Reference"}</p>
              <p className="font-mono">{booking.reference || booking._id}</p>
            </div>
          </div>

          {booking.notes && (
            <div className="mt-4">
              <p className="text-gray-400 mb-1">{t("bookings.notes") || "Notes"}</p>
              <p className="text-sm text-gray-300">{booking.notes}</p>
            </div>
          )}

          {booking.cancellationReason && (
            <div className="mt-4">
              <p className="text-gray-400 mb-1">{t("bookings.cancellationReason") || "Cancellation reason"}</p>
              <p className="text-sm text-red-300">{booking.cancellationReason}</p>
            </div>
          )}

          {canCancel(booking) && (
            <div className="mt-6">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 text-sm rounded-lg border border-red-400/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                {cancelling ? (t('common.loading') || '...') : (t('bookings.cancel') || 'Cancel booking')}
              </button>
            </div>
          )}
        </div>

        <Link to="/bookings" className="text-accent underline">{t("bookings.backToList") || "Back to my bookings"}</Link>
      </div>
    </div>
  );
};

export default BookingDetailPage;

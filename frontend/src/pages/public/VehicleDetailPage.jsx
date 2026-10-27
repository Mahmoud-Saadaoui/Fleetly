import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { vehiclesAPI, bookingsAPI, branchesAPI } from "../../api/endpoints";
import { useAuth } from "../../hooks/useAuth";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";
import { getApiErrorMessage } from "../../utils/apiError";
import { rangeTouchesBooking, toBookedDayRanges } from "../../utils/availability";
import { clearBookingDraft, loadBookingDraft, saveBookingDraft } from "../../utils/bookingDraft";
import AvailabilityCalendar from "../../components/booking/AvailabilityCalendar";
import toast from "react-hot-toast";

const generateIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const QUOTE_TTL_MS = 10 * 60 * 1000;

const buildDateTime = (date, time) => {
  if (!date) return null;
  const [hours, minutes] = (time || "10:00").split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const SpecItem = ({ label, value }) => (
  <div className="bg-dark/50 p-4 rounded-lg">
    <p className="text-xs text-gray-400 mb-1">{label}</p>
    <p className="text-sm font-semibold break-words">{value}</p>
  </div>
);

const VehicleDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [vehicle, setVehicle] = useState(null);
  const [branches, setBranches] = useState([]);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  // Restore a booking the visitor had started before being sent to the login page.
  const [initialDraft] = useState(() => loadBookingDraft(id));
  const [range, setRange] = useState(() => ({ start: initialDraft?.startDate ?? null, end: initialDraft?.endDate ?? null }));
  const [times, setTimes] = useState(() => ({
    pickup: initialDraft?.pickupTime || "10:00",
    return: initialDraft?.returnTime || "10:00",
  }));
  const [bookingData, setBookingData] = useState(() => ({
    pickupBranch: initialDraft?.pickupBranch || "",
    returnBranch: initialDraft?.returnBranch || "",
    notes: initialDraft?.notes || "",
  }));
  const [quote, setQuote] = useState(null);
  const [quoteExpiresAt, setQuoteExpiresAt] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());

  useEffect(() => {
    fetchVehicle();
    fetchBranches();
    fetchAvailability();
  }, [id]);

  const fetchVehicle = async () => {
    try {
      const res = await vehiclesAPI.getById(id);
      if (res.data.success) {
        setVehicle(res.data.data);
        setActiveImage(0);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error(t("vehicleDetail.notFound"));
        navigate("/vehicles");
      } else {
        toast.error(getApiErrorMessage(err, t("vehicleDetail.loadError")));
      }
    } finally {
      setLoading(false);
    }
  };

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

  const fetchAvailability = async () => {
    try {
      const res = await vehiclesAPI.getAvailability(id);
      if (res.data.success) {
        setBookedRanges(res.data.data.bookedRanges || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const bookedDays = useMemo(() => toBookedDayRanges(bookedRanges), [bookedRanges]);
  const startAt = useMemo(() => buildDateTime(range.start, times.pickup), [range.start, times.pickup]);
  const endAt = useMemo(() => buildDateTime(range.end, times.return), [range.end, times.return]);

  // A vehicle that is rented, reserved or in maintenance can never be booked:
  // the backend rejects every date, so we must not even offer the calendar.
  const vehicleStatus = vehicle?.status;
  const isBookable = vehicleStatus === "available";

  // Persist the in-progress booking so it is restored after the login page.
  // An empty form clears the draft instead of storing useless data.
  useEffect(() => {
    if (vehicleStatus && vehicleStatus !== "available") {
      clearBookingDraft();
      return;
    }
    const hasContent =
      Boolean(range.start) ||
      Boolean(bookingData.pickupBranch) ||
      Boolean(bookingData.returnBranch) ||
      Boolean(bookingData.notes);

    if (!hasContent) {
      clearBookingDraft();
      return;
    }

    saveBookingDraft({
      vehicleId: id,
      startDate: range.start,
      endDate: range.end,
      pickupTime: times.pickup,
      returnTime: times.return,
      pickupBranch: bookingData.pickupBranch,
      returnBranch: bookingData.returnBranch,
      notes: bookingData.notes,
    });
  }, [id, range, times, bookingData, vehicleStatus]);

  // Auto-quote as soon as a valid range + times are chosen (Calendly-like).
  useEffect(() => {
    // Never ask for a quote while the vehicle itself is not bookable.
    if (vehicleStatus !== "available") {
      setQuote(null);
      setQuoteExpiresAt(null);
      return undefined;
    }
    if (!startAt || !endAt || endAt <= startAt) {
      setQuote(null);
      setQuoteExpiresAt(null);
      return undefined;
    }
    setQuote(null);
    setQuoteError("");
    setIdempotencyKey(generateIdempotencyKey());
    let cancelled = false;
    const run = async () => {
      setQuoting(true);
      try {
        const res = await bookingsAPI.quote({
          vehicleId: id,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        });
        if (!cancelled && res.data.success) {
          setQuote(res.data.data);
          setQuoteExpiresAt(Date.now() + QUOTE_TTL_MS);
        }
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setQuoteExpiresAt(null);
          setQuoteError(getApiErrorMessage(err, t("vehicleDetail.quoteError")));
        }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [startAt, endAt, id, vehicleStatus, quoteAttempt]);

  const handleSelectRange = (start, end) => {
    if (!end) {
      setRange({ start, end: null });
      setQuote(null);
      setQuoteExpiresAt(null);
      setQuoteError("");
      setIdempotencyKey(generateIdempotencyKey());
      return;
    }
    if (rangeTouchesBooking(start, end, bookedDays)) {
      toast.error(t("vehicleDetail.rangeUnavailable"));
      setQuote(null);
      setQuoteExpiresAt(null);
      setQuoteError("");
      setIdempotencyKey(generateIdempotencyKey());
      return;
    }
    setRange({ start, end });
  };

  const retryQuote = () => {
    setQuoteError("");
    setQuoteAttempt((attempt) => attempt + 1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBookingData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!isBookable) {
      toast.error(t("vehicleDetail.unavailableTitle"));
      return;
    }
    if (!isAuthenticated) {
      toast.error(t("vehicleDetail.loginRequired"));
      navigate("/login", { state: { from: location } });
      return;
    }
    if (!startAt || !endAt || endAt <= startAt) {
      toast.error(t("vehicleDetail.selectDates"));
      return;
    }
    if (!quote || !quoteExpiresAt || Date.now() >= quoteExpiresAt) {
      setQuote(null);
      setQuoteExpiresAt(null);
      setQuoteError(t("vehicleDetail.quoteExpired", "Your quote expired. Please retry."));
      toast.error(t("vehicleDetail.quoteFirst"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await bookingsAPI.create({
        vehicleId: id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        pickupBranch: bookingData.pickupBranch || undefined,
        returnBranch: bookingData.returnBranch || undefined,
        notes: bookingData.notes,
        idempotencyKey,
      });
      if (res.data.success) {
        clearBookingDraft();
        toast.success(res.data.message || t("vehicleDetail.bookingSuccess"));
        navigate("/my-bookings");
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setQuote(null);
        setQuoteExpiresAt(null);
        setIdempotencyKey(generateIdempotencyKey());
        await fetchAvailability();
        setQuoteError(getApiErrorMessage(err, t("vehicleDetail.rangeUnavailable")));
      } else {
        setQuoteError(getApiErrorMessage(err, t("vehicleDetail.bookingError")));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center pt-24">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  const images = vehicle?.images || [];
  const branchRef = vehicle?.branch;
  const branchName =
    (typeof branchRef === "object" && branchRef?.name) ||
    branches.find((b) => b._id === (typeof branchRef === "object" ? branchRef?._id : branchRef))?.name ||
    vehicle?.location ||
    "—";

  return (
    <div className="min-h-screen bg-dark px-6 pt-24 pb-16">
      <div className="max-w-6xl mx-auto">
        <Link to="/vehicles" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
          <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("vehicleDetail.back")}
        </Link>

        {!vehicle ? (
          <div className="text-center py-24 text-gray-400">{t("vehicleDetail.notFound")}</div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Main info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image frame only exists when the vehicle actually has images */}
              {images.length > 0 && (
                <div className="bg-dark-light/50 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="aspect-[16/9] bg-dark">
                    <img
                      src={images[activeImage]}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto p-4">
                      {images.map((src, index) => (
                        <button
                          key={`${src}-${index}`}
                          type="button"
                          onClick={() => setActiveImage(index)}
                          aria-label={`${vehicle.make} ${vehicle.model} ${index + 1}`}
                          className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border transition-opacity ${
                            index === activeImage ? "border-accent" : "border-white/10 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-dark-light/50 border border-white/10 rounded-2xl p-8">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex px-3 py-1 bg-accent/20 text-accent text-xs font-semibold rounded-full">
                    {t(`admin.categories.${vehicle.category}`, vehicle.category)}
                  </span>
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      isBookable ? "bg-white/10 text-gray-200" : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {t(`admin.statuses.${vehicleStatus}`, vehicleStatus)}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-cairo font-bold mb-2">
                  {vehicle.make} {vehicle.model}
                </h1>
                <p className="text-gray-400">
                  {t(`admin.transmissions.${vehicle.transmission}`, vehicle.transmission)} •{" "}
                  {t(`admin.fuelTypes.${vehicle.fuelType}`, vehicle.fuelType)} •{" "}
                  {t("vehicles.seats", { count: vehicle.seats })}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                  <SpecItem label={t("vehicleDetail.category")} value={t(`admin.categories.${vehicle.category}`, vehicle.category)} />
                  <SpecItem label={t("vehicleDetail.transmission")} value={t(`admin.transmissions.${vehicle.transmission}`, vehicle.transmission)} />
                  <SpecItem label={t("vehicleDetail.fuel")} value={t(`admin.fuelTypes.${vehicle.fuelType}`, vehicle.fuelType)} />
                  <SpecItem label={t("vehicleDetail.seats")} value={vehicle.seats} />
                  <SpecItem label={t("vehicleDetail.registration")} value={vehicle.registrationNumber} />
                  <SpecItem label={t("vehicleDetail.agency")} value={branchName} />
                  {vehicle.mileage !== null && vehicle.mileage !== undefined && (
                    <SpecItem label={t("vehicleDetail.mileage")} value={`${formatNumber(vehicle.mileage)} km`} />
                  )}
                  {vehicle.vin && <SpecItem label={t("vehicleDetail.vin")} value={vehicle.vin} />}
                </div>
              </div>
            </div>

            {/* Booking panel */}
            <div className="lg:col-span-1">
              <div className="bg-dark-light/50 border border-white/10 rounded-2xl p-6">
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-bold text-accent">{formatCurrency(vehicle.dailyRateCents, vehicle.currency)}</span>
                  <span className="text-gray-400">{t("vehicleDetail.perDay")}</span>
                </div>

                {isBookable ? (
                  <>
                    <h2 className="font-cairo font-semibold mb-3">{t("vehicleDetail.availability")}</h2>
                    <AvailabilityCalendar
                      bookedRanges={bookedRanges}
                      startDate={range.start}
                      endDate={range.end}
                      onSelect={handleSelectRange}
                    />
                    <p className="mt-3 text-xs text-gray-500">{t("vehicleDetail.calendarHint")}</p>

                    {/* Selected range + times */}
                    <div className="mt-4 rounded-lg border border-white/10 bg-dark/40 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-400">{t("vehicleDetail.from")}</span>
                        <span className="font-medium">{range.start ? formatDate(range.start) : t("vehicleDetail.noDateSelected")}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-gray-400">{t("vehicleDetail.toDate")}</span>
                        <span className="font-medium">{range.end ? formatDate(range.end) : "—"}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-1 block text-xs text-gray-400">{t("vehicleDetail.pickupTime")}</span>
                          <input
                            type="time"
                            value={times.pickup}
                            onChange={(e) => setTimes((prev) => ({ ...prev, pickup: e.target.value }))}
                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-gray-400">{t("vehicleDetail.returnTime")}</span>
                          <input
                            type="time"
                            value={times.return}
                            onChange={(e) => setTimes((prev) => ({ ...prev, return: e.target.value }))}
                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                          />
                        </label>
                      </div>
                    </div>

                    <form onSubmit={handleSubmitBooking} className="mt-5 space-y-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">{t("vehicleDetail.pickupBranch")}</label>
                        <select
                          name="pickupBranch"
                          value={bookingData.pickupBranch}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                        >
                          <option value="">{t("vehicleDetail.select")}</option>
                          {branches.map((b) => (
                            <option key={b._id} value={b._id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">{t("vehicleDetail.returnBranch")}</label>
                        <select
                          name="returnBranch"
                          value={bookingData.returnBranch}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                        >
                          <option value="">{t("vehicleDetail.select")}</option>
                          {branches.map((b) => (
                            <option key={b._id} value={b._id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">{t("vehicleDetail.notes")}</label>
                        <textarea
                          name="notes"
                          value={bookingData.notes}
                          onChange={handleChange}
                          rows={3}
                          placeholder={t("vehicleDetail.notesPlaceholder")}
                          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                        />
                      </div>

                      {quoting ? (
                        <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-dark p-3 text-sm text-gray-400">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" aria-hidden="true" />
                          {t("common.loading")}
                        </div>
                      ) : (
                        <>
                          {quoteError && (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                              <p>{quoteError}</p>
                              <button type="button" onClick={retryQuote} className="mt-2 text-accent underline">
                                {t("common.retry", "Retry")}
                              </button>
                            </div>
                          )}
                          {quote && quoteExpiresAt > Date.now() && (
                          <div className="bg-dark border border-accent/30 rounded-lg p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t("vehicleDetail.dailyRate")}</span>
                              <span>{formatCurrency(quote.pricing.dailyRateCents, quote.pricing.currency)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t("vehicleDetail.days")}</span>
                              <span>{quote.pricing.rentalDays}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t("vehicleDetail.subtotal")}</span>
                              <span>{formatCurrency(quote.pricing.subtotalCents, quote.pricing.currency)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t("vehicleDetail.tax")}</span>
                              <span>{formatCurrency(quote.pricing.taxCents, quote.pricing.currency)}</span>
                            </div>
                            <div className="flex justify-between border-t border-white/10 pt-2 mt-2 text-lg font-semibold">
                              <span>{t("vehicleDetail.total")}</span>
                              <span className="text-accent">{formatCurrency(quote.pricing.totalCents, quote.pricing.currency)}</span>
                            </div>
                          </div>
                          )}
                        </>
                      )}

                      <button
                        type="submit"
                        disabled={submitting || !quote}
                        className="w-full py-3 bg-accent text-dark font-semibold rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? t("vehicleDetail.booking") : t("vehicleDetail.book")}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                    <p className="mb-1 font-semibold text-amber-200">{t("vehicleDetail.unavailableTitle")}</p>
                    <p className="text-sm text-amber-100/80">
                      {t("vehicleDetail.unavailableText", { status: t(`admin.statuses.${vehicleStatus}`, vehicleStatus) })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleDetailPage;

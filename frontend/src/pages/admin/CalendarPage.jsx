import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import arLocale from "@fullcalendar/core/locales/ar";
import enGbLocale from "@fullcalendar/core/locales/en-gb";
import { agentBookingsAPI, branchesAPI, vehiclesAPI } from "../../api/endpoints";
import { formatDateTime, formatCurrency } from "../../utils/format";
import toast from "react-hot-toast";

const CALENDAR_LOCALES = { fr: frLocale, ar: arLocale, en: enGbLocale };

const CalendarPage = () => {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ branchId: '', vehicleId: '', status: '' });
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [branches, setBranches] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const fetchBookings = async (start, end) => {
    setLoading(true);
    try {
      const params = {};
      if (start) params.dateFrom = start.toISOString ? start.toISOString() : start;
      if (end) params.dateTo = end.toISOString ? end.toISOString() : end;
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.vehicleId) params.vehicleId = filters.vehicleId;
      if (filters.status) params.status = filters.status;
      const first = await agentBookingsAPI.getAll({ ...params, page: 1, limit: 100 });
      let bookings = first.data.success ? first.data.data : [];
      const pages = first.data.pagination?.pages || 1;
      for (let page = 2; page <= pages; page += 1) {
        const next = await agentBookingsAPI.getAll({ ...params, page, limit: 100 });
        if (next.data.success) bookings = bookings.concat(next.data.data);
      }
      if (first.data.success) {
        const evts = bookings
          .filter(b => ["confirmed", "active", "pending_payment"].includes(b.status))
          .map(b => ({
            id: b._id,
            title: `${b.vehicle?.make} ${b.vehicle?.model} - ${b.customer?.name || ""}`,
            start: b.startAt,
            end: b.endAt,
            backgroundColor: b.status === "active" ? "#22c55e" : b.status === "confirmed" ? "#3b82f6" : "#f59e0b",
            borderColor: "transparent",
            extendedProps: { booking: b }
          }));
        setEvents(evts);
      }
    } catch {
      toast.error(t("admin.common.error"));
    } finally {
      setLoading(false);
    }
  };

  // The option lists are loaded once when the calendar opens.
  useEffect(() => {
    Promise.all([branchesAPI.getAll({ limit: 100 }), vehiclesAPI.getAll({ limit: 100 })])
      .then(([branchResponse, vehicleResponse]) => {
        if (branchResponse.data.success) setBranches(branchResponse.data.data);
        if (vehicleResponse.data.success) setVehicles(vehicleResponse.data.data);
      })
      .catch(() => toast.error(t("admin.common.error")));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch the visible range when a calendar filter changes.
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchBookings(dateRange.start, dateRange.end);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleEventClick = (info) => {
    setSelectedEvent(info.event.extendedProps.booking);
    setShowModal(true);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-cairo font-bold mb-2">{t("admin.calendar.title")}</h1>
        <p className="text-gray-400">{t("admin.calendar.subtitle")}</p>
      </div>
      <div className="bg-dark-light/50 border border-white/10 rounded-xl p-6 mb-6 grid md:grid-cols-3 gap-4">
        <select value={filters.branchId} onChange={(e) => setFilters(f => ({ ...f, branchId: e.target.value }))} className="px-3 py-2 bg-dark border border-white/10 rounded-lg text-white">
          <option value="">{t('admin.common.all')} branches</option>
          {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
        </select>
        <select value={filters.vehicleId} onChange={(e) => setFilters(f => ({ ...f, vehicleId: e.target.value }))} className="px-3 py-2 bg-dark border border-white/10 rounded-lg text-white">
          <option value="">{t('admin.common.all')} vehicles</option>
          {vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.make} {vehicle.model}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))} className="px-3 py-2 bg-dark border border-white/10 rounded-lg text-white">
          <option value="">{t('admin.common.all')}</option>
          <option value="pending_payment">{t('bookings.status.pending_payment')}</option>
          <option value="confirmed">{t('bookings.status.confirmed')}</option>
          <option value="active">{t('bookings.status.active')}</option>
        </select>
      </div>
      <div className="bg-dark-light/50 border border-white/10 rounded-xl p-6">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={CALENDAR_LOCALES[(i18n.language || "fr").split("-")[0]] || frLocale}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
          }}
          events={events}
          eventClick={handleEventClick}
          height="700px"
          themeSystem="standard"
          datesSet={(arg) => {
            setDateRange({ start: arg.start, end: arg.end });
            fetchBookings(arg.start, arg.end);
          }}
        />
      </div>

      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-dark-light border border-white/10 rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{t("admin.calendar.details")}</h2>
            <div className="space-y-3 text-sm">
              <div><span className="text-gray-400">{t("admin.common.client")}:</span> {selectedEvent.customer?.name}</div>
              <div><span className="text-gray-400">{t("admin.common.vehicle")}:</span> {selectedEvent.vehicle?.make} {selectedEvent.vehicle?.model}</div>
              <div><span className="text-gray-400">{t("admin.calendar.start")}:</span> {formatDateTime(selectedEvent.startAt)}</div>
              <div><span className="text-gray-400">{t("admin.calendar.end")}:</span> {formatDateTime(selectedEvent.endAt)}</div>
              <div><span className="text-gray-400">{t("admin.common.amount")}:</span> {formatCurrency(selectedEvent.pricing?.totalCents)}</div>
              <div><span className="text-gray-400">{t("admin.common.status")}:</span> {t(`bookings.status.${selectedEvent.status}`, selectedEvent.status)}</div>
            </div>
            <button onClick={() => setShowModal(false)} className="mt-6 w-full py-2 border border-white/20 rounded-lg">{t("admin.actions.close")}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;

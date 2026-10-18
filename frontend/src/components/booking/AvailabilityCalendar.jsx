import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ar, enUS, fr } from "date-fns/locale";
import { isDayBooked, toBookedDayRanges } from "../../utils/availability";

const DATE_LOCALES = { fr, en: enUS, ar };

/**
 * Calendly-inspired date-range picker.
 *
 * - Already booked days are shown struck-through and cannot be clicked.
 * - First click picks the start date, second click the end date.
 * - Hovering previews the range before the end date is confirmed.
 */
const AvailabilityCalendar = ({ bookedRanges = [], startDate, endDate, onSelect }) => {
  const { t, i18n } = useTranslation();
  const locale = DATE_LOCALES[(i18n.language || "fr").split("-")[0]] || fr;
  const today = startOfToday();

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(startDate || today));
  const [hoverDay, setHoverDay] = useState(null);

  const bookedDays = useMemo(() => toBookedDayRanges(bookedRanges), [bookedRanges]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const weekDays = days.slice(0, 7);
  const isCurrentMonth = isSameMonth(viewMonth, today);

  // Range being previewed while the end date is not chosen yet.
  const previewEnd =
    endDate || (startDate && hoverDay && isAfter(hoverDay, startDate) ? hoverDay : null);

  const isWithinRange = (day) => {
    if (!startDate) return false;
    const end = endDate || previewEnd || startDate;
    return !isBefore(day, startOfDay(startDate)) && !isAfter(day, startOfDay(end));
  };

  const handleSelect = (day) => {
    if (isBefore(day, today) || isDayBooked(day, bookedDays)) return;
    // Starting a fresh range when none is open (or a full one already exists).
    if (!startDate || (startDate && endDate) || isBefore(day, startDate)) {
      onSelect(startOfDay(day), null);
      return;
    }
    onSelect(startOfDay(startDate), startOfDay(day));
  };

  return (
    <div className="rounded-xl border border-white/10 bg-dark/40 p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          disabled={isCurrentMonth}
          aria-label={t("vehicleDetail.previousMonth")}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="font-cairo font-semibold capitalize">{format(viewMonth, "LLLL yyyy", { locale })}</div>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          aria-label={t("vehicleDetail.nextMonth")}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="text-center text-[11px] uppercase tracking-wide text-gray-500">
            {format(day, "EEEEEE", { locale })}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[320px]" onMouseLeave={() => setHoverDay(null)}>
        {days.map((day) => {
          const bookedDay = isDayBooked(day, bookedDays);
          const past = isBefore(day, today);
          const disabled = past || bookedDay;
          const isStart = Boolean(startDate && isSameDay(day, startDate));
          const isEnd = Boolean(endDate && isSameDay(day, endDate));
          const inRange = Boolean(isWithinRange(day) && !isStart && !isEnd);
          const outside = !isSameMonth(day, viewMonth);

          let classes = "relative h-9 w-full rounded-lg text-sm transition-colors ";
          if (bookedDay) classes += "cursor-not-allowed bg-white/5 text-gray-500 line-through";
          else if (past) classes += "cursor-not-allowed text-gray-600";
          else if (isStart || isEnd) classes += "bg-accent font-semibold text-dark";
          else if (inRange) classes += "bg-accent/20 text-white";
          else classes += "text-gray-200 hover:bg-white/10";
          if (outside) classes += " opacity-40";

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleSelect(day)}
              onMouseEnter={() => setHoverDay(day)}
              disabled={disabled}
              aria-label={format(day, "PPPP", { locale })}
              aria-pressed={isStart || isEnd}
              className={classes}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-accent" aria-hidden="true" />
          {t("vehicleDetail.legendSelected")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-white/10" aria-hidden="true" />
          {t("vehicleDetail.legendBooked")}
        </span>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;

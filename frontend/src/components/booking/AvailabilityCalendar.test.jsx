// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AvailabilityCalendar from './AvailabilityCalendar';
import { useFrench } from '../../test/testUtils';

// Mid-June 2026: the calendar opens on June and the past days are before this date.
const TODAY = new Date(2026, 5, 15, 12);
const dayLabel = (date) => format(date, 'PPPP', { locale: fr });
const dayButton = (date) => screen.getByRole('button', { name: dayLabel(date) });

beforeAll(useFrench);
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('AvailabilityCalendar', () => {
  it('cannot pick a day that is already in the past', () => {
    render(<AvailabilityCalendar bookedRanges={[]} onSelect={vi.fn()} />);
    expect(dayButton(new Date(2026, 5, 3)).disabled).toBe(true);
  });

  it('shows booked days as unavailable and never reports them as selected', () => {
    const onSelect = vi.fn();
    render(
      <AvailabilityCalendar
        bookedRanges={[{
          startAt: new Date(2026, 5, 20).toISOString(),
          endAt: new Date(2026, 5, 21, 23).toISOString(),
        }]}
        onSelect={onSelect}
      />,
    );

    const booked = dayButton(new Date(2026, 5, 20));
    expect(booked.disabled).toBe(true);
    fireEvent.click(booked);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('asks for a start date first, then an end date on the second click', () => {
    const onSelect = vi.fn();
    const { rerender } = render(<AvailabilityCalendar bookedRanges={[]} onSelect={onSelect} />);

    fireEvent.click(dayButton(new Date(2026, 5, 17)));
    expect(onSelect).toHaveBeenLastCalledWith(new Date(2026, 5, 17), null);

    rerender(
      <AvailabilityCalendar
        bookedRanges={[]}
        startDate={new Date(2026, 5, 17)}
        endDate={null}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(dayButton(new Date(2026, 5, 19)));
    expect(onSelect).toHaveBeenLastCalledWith(new Date(2026, 5, 17), new Date(2026, 5, 19));
  });

  it('restarts the range when the user clicks a day before the current start', () => {
    const onSelect = vi.fn();
    render(
      <AvailabilityCalendar
        bookedRanges={[]}
        startDate={new Date(2026, 5, 18)}
        endDate={null}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(dayButton(new Date(2026, 5, 16)));
    expect(onSelect).toHaveBeenLastCalledWith(new Date(2026, 5, 16), null);
  });
});

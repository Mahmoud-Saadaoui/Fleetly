// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import BookingDetailPage from './BookingDetailPage';
import { bookingsAPI } from '../../api/endpoints';
import fr from '../../locales/fr.json';
import { renderWithAuth, useFrench } from '../../test/testUtils';

vi.mock('../../api/endpoints', () => ({
  bookingsAPI: { getMineById: vi.fn(), cancel: vi.fn() },
}));

const DAY_MS = 86400000;

const bookingWith = (overrides = {}) => ({
  _id: 'b1',
  reference: 'REF123',
  status: 'confirmed',
  startAt: new Date(Date.now() + 5 * DAY_MS).toISOString(),
  endAt: new Date(Date.now() + 7 * DAY_MS).toISOString(),
  vehicle: { make: 'Tesla', model: 'Model 3', year: 2024, registrationNumber: 'AB-123-CD' },
  pricing: { rentalDays: 2, totalCents: 25000, currency: 'EUR' },
  ...overrides,
});

const app = () => (
  <Routes>
    <Route path="/bookings/:id" element={<BookingDetailPage />} />
  </Routes>
);

beforeAll(useFrench);
beforeEach(() => {
  vi.clearAllMocks();
  bookingsAPI.getMineById.mockResolvedValue({ data: { success: true, data: bookingWith() } });
  bookingsAPI.cancel.mockResolvedValue({ data: { success: true, message: 'Réservation annulée.' } });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BookingDetailPage', () => {
  it('cancels a confirmed booking with the reason typed by the client', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Empêchement');
    renderWithAuth(app(), { route: '/bookings/b1' });

    fireEvent.click(await screen.findByRole('button', { name: fr.bookings.cancel }));

    await waitFor(() => expect(bookingsAPI.cancel).toHaveBeenCalledWith('b1', { reason: 'Empêchement' }));
    // The page reloads the booking so the new status is shown.
    await waitFor(() => expect(bookingsAPI.getMineById).toHaveBeenCalledTimes(2));
  });

  it('does nothing when the client dismisses the cancellation prompt', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    renderWithAuth(app(), { route: '/bookings/b1' });

    fireEvent.click(await screen.findByRole('button', { name: fr.bookings.cancel }));

    expect(bookingsAPI.cancel).not.toHaveBeenCalled();
  });

  it('offers no cancel action once the booking is completed', async () => {
    bookingsAPI.getMineById.mockResolvedValue({
      data: { success: true, data: bookingWith({ status: 'completed' }) },
    });
    renderWithAuth(app(), { route: '/bookings/b1' });

    await screen.findAllByText('REF123');
    expect(screen.queryByRole('button', { name: fr.bookings.cancel })).toBeNull();
  });
});

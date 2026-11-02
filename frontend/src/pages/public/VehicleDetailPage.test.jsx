// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import VehicleDetailPage from './VehicleDetailPage';
import { vehiclesAPI, bookingsAPI, branchesAPI } from '../../api/endpoints';
import { renderWithAuth, useFrench } from '../../test/testUtils';

vi.mock('../../api/endpoints', () => ({
  vehiclesAPI: { getById: vi.fn(), getAvailability: vi.fn() },
  bookingsAPI: { quote: vi.fn(), create: vi.fn() },
  branchesAPI: { getAll: vi.fn() },
}));

const DAY_MS = 86400000;
const VEHICLE_ID = 'v1';

const vehicle = {
  _id: VEHICLE_ID,
  make: 'Tesla',
  model: 'Model 3',
  year: 2024,
  seats: 5,
  transmission: 'Automatique',
  fuelType: 'Électrique',
  category: 'Électrique',
  status: 'available',
  dailyRateCents: 5000,
  currency: 'EUR',
  images: [],
  branch: null,
};

// The client already picked dates before logging in; the booking draft restores them.
const seedDraft = () => {
  localStorage.setItem('fleetly_booking_draft', JSON.stringify({
    vehicleId: VEHICLE_ID,
    startDate: new Date(Date.now() + 5 * DAY_MS).toISOString(),
    endDate: new Date(Date.now() + 7 * DAY_MS).toISOString(),
    pickupTime: '10:00',
    returnTime: '10:00',
    savedAt: Date.now(),
  }));
};

const app = () => (
  <Routes>
    <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
    <Route path="/my-bookings" element={<p>my-bookings-page</p>} />
  </Routes>
);

const renderPage = () => renderWithAuth(app(), {
  route: `/vehicles/${VEHICLE_ID}`,
  auth: { isAuthenticated: true, user: { _id: 'u1', role: 'user' } },
});

const submitBooking = (container) => fireEvent.submit(container.querySelector('form'));

beforeAll(useFrench);
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  seedDraft();
  vehiclesAPI.getById.mockResolvedValue({ data: { success: true, data: vehicle } });
  vehiclesAPI.getAvailability.mockResolvedValue({ data: { success: true, data: { bookedRanges: [] } } });
  branchesAPI.getAll.mockResolvedValue({ data: { success: true, data: [] } });
  bookingsAPI.quote.mockResolvedValue({
    data: {
      success: true,
      data: {
        vehicleId: VEHICLE_ID,
        pricing: { dailyRateCents: 5000, rentalDays: 2, subtotalCents: 10000, extrasCents: 0, discountCents: 0, taxCents: 2000, totalCents: 12000, currency: 'EUR' },
      },
    },
  });
});
afterEach(cleanup);

describe('VehicleDetailPage booking', () => {
  it('requests a quote for the restored dates and enables the booking button', async () => {
    const { container } = renderPage();

    const button = await waitFor(() => {
      const submit = container.querySelector('form button[type="submit"]');
      expect(submit).toBeTruthy();
      expect(submit.disabled).toBe(false);
      return submit;
    });

    expect(button).toBeTruthy();
    expect(bookingsAPI.quote).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: VEHICLE_ID }));
  });

  it('on a 409 from the server, explains the conflict, refreshes availability and forbids resubmitting the stale quote', async () => {
    bookingsAPI.create.mockRejectedValue({
      response: { status: 409, data: { success: false, message: 'Vehicle is already booked for these dates' } },
    });
    const { container } = renderPage();

    await waitFor(() => expect(container.querySelector('form button[type="submit"]').disabled).toBe(false));
    expect(vehiclesAPI.getAvailability).toHaveBeenCalledTimes(1);

    submitBooking(container);

    expect(await screen.findByText('Vehicle is already booked for these dates')).toBeTruthy();
    expect(bookingsAPI.create).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(vehiclesAPI.getAvailability).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(container.querySelector('form button[type="submit"]').disabled).toBe(true));
  });
});

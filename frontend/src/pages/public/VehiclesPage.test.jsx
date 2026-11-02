// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import VehiclesPage from './VehiclesPage';
import { vehiclesAPI, branchesAPI } from '../../api/endpoints';
import fr from '../../locales/fr.json';
import { renderWithAuth, useFrench } from '../../test/testUtils';

vi.mock('../../api/endpoints', () => ({
  vehiclesAPI: { getAll: vi.fn() },
  branchesAPI: { getAll: vi.fn() },
}));

const emptyPage = { data: { success: true, data: [], pagination: { page: 1, limit: 12, total: 0, pages: 0 } } };

beforeAll(useFrench);
beforeEach(() => {
  vi.clearAllMocks();
  vehiclesAPI.getAll.mockResolvedValue(emptyPage);
  branchesAPI.getAll.mockResolvedValue({ data: { success: true, data: [] } });
});
afterEach(cleanup);

describe('VehiclesPage', () => {
  it('loads the catalogue on first visit and shows the empty state when nothing matches', async () => {
    renderWithAuth(<VehiclesPage />, { route: '/vehicles' });

    expect(await screen.findByText(fr.vehicles.none)).toBeTruthy();
    expect(vehiclesAPI.getAll).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }), expect.anything());
  });

  it('sends the search term to the API once the user stops typing', async () => {
    renderWithAuth(<VehiclesPage />, { route: '/vehicles' });
    await screen.findByText(fr.vehicles.none);

    fireEvent.change(screen.getByPlaceholderText(fr.vehicles.searchPlaceholder), { target: { value: 'tesla' } });

    await waitFor(() => expect(vehiclesAPI.getAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'tesla', page: 1 }),
      expect.anything(),
    ));
  });

  it('shows an error and a retry button when the catalogue cannot be loaded, then recovers', async () => {
    vehiclesAPI.getAll.mockRejectedValueOnce(new Error('network down'));
    renderWithAuth(<VehiclesPage />, { route: '/vehicles' });

    expect(await screen.findByRole('button', { name: fr.common.retry })).toBeTruthy();
    expect(screen.queryByText(fr.vehicles.none)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: fr.common.retry }));
    expect(await screen.findByText(fr.vehicles.none)).toBeTruthy();
    expect(vehiclesAPI.getAll).toHaveBeenCalledTimes(2);
  });
});

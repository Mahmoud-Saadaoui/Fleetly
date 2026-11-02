// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import LoginPage from './LoginPage';
import fr from '../locales/fr.json';
import { renderWithAuth, useFrench } from '../test/testUtils';

beforeAll(useFrench);
afterEach(cleanup);

const app = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<p>home-page</p>} />
  </Routes>
);

const fillAndSubmit = (container, email, password) => {
  fireEvent.change(screen.getByPlaceholderText(fr.auth.emailPlaceholder), { target: { value: email } });
  fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: password } });
  fireEvent.submit(container.querySelector('form'));
};

describe('LoginPage', () => {
  it('sends the typed credentials to the auth context and goes home on success', async () => {
    const login = vi.fn(async () => ({ success: true }));
    const { container } = renderWithAuth(app(), { route: '/login', auth: { login } });

    fillAndSubmit(container, 'client@test.com', 'Passw0rd');

    await waitFor(() => expect(screen.getByText('home-page')).toBeTruthy());
    expect(login).toHaveBeenCalledWith({ email: 'client@test.com', password: 'Passw0rd' });
  });

  it('stays on the login form when the credentials are refused', async () => {
    const login = vi.fn(async () => ({ success: false, message: 'Invalid email or password' }));
    const { container } = renderWithAuth(app(), { route: '/login', auth: { login } });

    fillAndSubmit(container, 'client@test.com', 'WrongPass1');
    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    await act(async () => {});

    expect(container.querySelector('form')).toBeTruthy();
    expect(screen.queryByText('home-page')).toBeNull();
  });
});

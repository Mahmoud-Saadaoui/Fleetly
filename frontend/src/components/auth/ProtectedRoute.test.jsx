// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, cleanup } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';
import { renderWithAuth, useFrench } from '../../test/testUtils';

beforeAll(useFrench);
afterEach(cleanup);

const app = () => (
  <Routes>
    <Route path="/login" element={<p>login-page</p>} />
    <Route path="/" element={<p>home-page</p>} />
    <Route
      path="/account"
      element={<ProtectedRoute><p>account-page</p></ProtectedRoute>}
    />
    <Route
      path="/admin"
      element={<ProtectedRoute roles={['admin', 'agency_manager']}><p>admin-page</p></ProtectedRoute>}
    />
  </Routes>
);

describe('ProtectedRoute', () => {
  it('sends an anonymous visitor to the login page', () => {
    renderWithAuth(app(), { route: '/account' });
    expect(screen.getByText('login-page')).toBeTruthy();
    expect(screen.queryByText('account-page')).toBeNull();
  });

  it('shows nothing protected while the session is still loading', () => {
    renderWithAuth(app(), { route: '/account', auth: { loading: true } });
    expect(screen.queryByText('account-page')).toBeNull();
    expect(screen.queryByText('login-page')).toBeNull();
  });

  it('lets an authenticated client into a route without role requirements', () => {
    renderWithAuth(app(), {
      route: '/account',
      auth: { isAuthenticated: true, user: { role: 'user' } },
    });
    expect(screen.getByText('account-page')).toBeTruthy();
  });

  it('keeps a client out of the staff area and sends them home', () => {
    renderWithAuth(app(), {
      route: '/admin',
      auth: { isAuthenticated: true, user: { role: 'user' } },
    });
    expect(screen.getByText('home-page')).toBeTruthy();
    expect(screen.queryByText('admin-page')).toBeNull();
  });

  it('lets an agency manager into the staff area', () => {
    renderWithAuth(app(), {
      route: '/admin',
      auth: { isAuthenticated: true, user: { role: 'agency_manager' } },
    });
    expect(screen.getByText('admin-page')).toBeTruthy();
  });

  it('lets an admin into the staff area', () => {
    renderWithAuth(app(), {
      route: '/admin',
      auth: { isAuthenticated: true, user: { role: 'admin' } },
    });
    expect(screen.getByText('admin-page')).toBeTruthy();
  });
});

import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../context/auth';
import i18n from '../config/i18n';

// Tests assert on French copy, the app's default language.
export const useFrench = () => i18n.changeLanguage('fr');

export const renderWithAuth = (ui, { route = '/', auth = {} } = {}) =>
  render(
    <AuthContext.Provider
      value={{
        isAuthenticated: false,
        user: null,
        loading: false,
        login: vi.fn(),
        ...auth,
      }}
    >
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  );

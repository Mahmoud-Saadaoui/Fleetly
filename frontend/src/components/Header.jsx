import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import LanguageSwitcher from "./common/LanguageSwitcher";
import UserMenu from "./auth/UserMenu";
import { FaBars, FaTimes } from "react-icons/fa";

const Header = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isStaff, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenu = () => setMobileOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold font-cairo tracking-tight" onClick={closeMenu}>
          Fleet<span className="text-accent">ly</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-cairo text-gray-300 hover:text-white transition-colors">
            {t("nav.home")}
          </Link>
          <Link to="/vehicles" className="text-sm font-cairo text-gray-300 hover:text-white transition-colors">
            {t("nav.vehicles")}
          </Link>
          {isAuthenticated && (
            <Link to="/my-bookings" className="text-sm font-cairo text-gray-300 hover:text-white transition-colors">
              {t("nav.myBookings")}
            </Link>
          )}
          {isStaff && (
            <Link to="/admin" className="text-sm font-cairo text-gray-300 hover:text-white transition-colors">
              {t("nav.dashboard")}
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <>
                <LanguageSwitcher />
                <Link
                  to="/login"
                  className="text-sm font-cairo text-gray-300 hover:text-white transition-colors"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2 bg-accent text-dark text-sm font-semibold rounded-full hover:bg-accent-light transition-colors"
                >
                  {t("nav.register")}
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            className="md:hidden p-2 text-gray-300 hover:text-white"
            aria-label={mobileOpen ? t("common.close") : t("common.menu")}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-dark/95 border-b border-white/10">
          <nav className="px-6 py-4 flex flex-col gap-3" role="menu">
            <Link to="/" onClick={closeMenu} className="text-sm text-gray-300 hover:text-white" role="menuitem">{t("nav.home")}</Link>
            <Link to="/vehicles" onClick={closeMenu} className="text-sm text-gray-300 hover:text-white" role="menuitem">{t("nav.vehicles")}</Link>
            {isAuthenticated && <Link to="/my-bookings" onClick={closeMenu} className="text-sm text-gray-300 hover:text-white" role="menuitem">{t("nav.myBookings")}</Link>}
            {isStaff && <Link to="/admin" onClick={closeMenu} className="text-sm text-gray-300 hover:text-white" role="menuitem">{t("nav.dashboard")}</Link>}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <LanguageSwitcher />
              {isAuthenticated ? (
                <button type="button" onClick={() => { logout(); closeMenu(); }} className="text-sm text-gray-300 hover:text-white">{t("nav.logout")}</button>
              ) : (
                <div className="flex gap-3">
                  <Link to="/login" onClick={closeMenu} className="text-sm text-gray-300 hover:text-white">{t("nav.login")}</Link>
                  <Link to="/register" onClick={closeMenu} className="text-sm text-accent">{t("nav.register")}</Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
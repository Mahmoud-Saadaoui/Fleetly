import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import LanguageSwitcher from "./common/LanguageSwitcher";
import UserMenu from "./auth/UserMenu";

const Header = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold font-cairo tracking-tight">
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

        </nav>
        <div className="flex items-center gap-3">
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
      </div>
    </header>
  );
};

export default Header;
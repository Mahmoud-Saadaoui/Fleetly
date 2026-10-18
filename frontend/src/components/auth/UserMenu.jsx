import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaGlobe,
  FaSignOutAlt,
  FaChevronDown,
  FaClipboardList,
  FaTachometerAlt,
} from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";

const LANGUAGES = [
  { code: "fr", label: "Français", short: "FR" },
  { code: "en", label: "English", short: "EN" },
  { code: "ar", label: "العربية", short: "ع" },
];

/**
 * Account menu displayed in the header once the user is authenticated.
 * Clicking the user name opens a dropdown at the header edge with:
 * - the language switcher
 * - contextual links (my bookings, dashboard if staff)
 * - logout
 */
const UserMenu = () => {
  const { t, i18n } = useTranslation();
  const { user, logout, isStaff } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const current =
    LANGUAGES.find((lang) => lang.code === i18n.language?.split("-")[0]) ??
    LANGUAGES[0];

  const initials = (user?.name || "?")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const itemClass =
    "flex items-center gap-3 w-full px-4 py-2.5 text-sm font-cairo text-gray-300 hover:bg-white/5 hover:text-white transition-colors";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 ps-1 pe-2 py-1 rounded-full border border-white/20 hover:border-white/40 transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-accent text-dark flex items-center justify-center text-xs font-bold font-cairo">
          {initials}
        </span>
        <span className="hidden sm:block max-w-[10rem] truncate text-sm font-cairo text-gray-200">
          {user?.name}
        </span>
        <FaChevronDown
          className={`text-xs text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute end-0 top-full mt-3 w-64 max-w-[calc(100vw-1rem)] rounded-xl border border-white/10 bg-dark-light shadow-xl overflow-hidden z-50"
          role="menu"
        >
          {/* User identity */}
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-sm font-cairo font-semibold text-white truncate">{user?.name}</p>
            {user?.email && (
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            )}
          </div>

          {/* Language */}
          <div className="p-2 border-b border-white/10">
            <p className="flex items-center gap-2 px-2 pt-1 pb-2 text-xs uppercase tracking-wider text-gray-500">
              <FaGlobe className="text-accent" />
              {t("language.label")}
            </p>
            <div className="flex gap-1" role="group" aria-label={t("language.label")}>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => i18n.changeLanguage(lang.code)}
                  aria-label={lang.label}
                  aria-pressed={lang.code === current.code}
                  className={`flex-1 px-2 py-2 rounded-lg text-sm font-cairo transition-colors ${
                    lang.code === current.code
                      ? "bg-accent/20 text-accent"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {lang.short}
                </button>
              ))}
            </div>
          </div>

          {/* Contextual links */}
          <nav className="p-2 border-b border-white/10">
            <Link to="/my-bookings" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <FaClipboardList className="text-accent" />
              <span>{t("nav.myBookings")}</span>
            </Link>
            {isStaff && (
              <Link to="/admin" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
                <FaTachometerAlt className="text-accent" />
                <span>{t("nav.dashboard")}</span>
              </Link>
            )}
          </nav>

          {/* Logout */}
          <button type="button" role="menuitem" onClick={logout} className={itemClass}>
            <FaSignOutAlt className="text-accent" />
            <span>{t("nav.logout")}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;

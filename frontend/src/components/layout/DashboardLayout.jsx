import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import Header from "../Header";
import {
  FaHome,
  FaCar,
  FaBuilding,
  FaCalendarAlt,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaClipboardList,
} from "react-icons/fa";

const SIDEBAR_ITEMS = [
  { to: "/admin", labelKey: "admin.nav.dashboard", icon: FaHome, roles: ["admin","agency_manager"] },
  { to: "/admin/vehicles", labelKey: "admin.nav.vehicles", icon: FaCar, roles: ["admin","agency_manager"] },
  { to: "/admin/branches", labelKey: "admin.nav.branches", icon: FaBuilding, roles: ["admin","agency_manager"] },
  { to: "/admin/bookings", labelKey: "admin.nav.bookings", icon: FaClipboardList, roles: ["admin","agency_manager"] },
  { to: "/admin/users", labelKey: "admin.nav.users", icon: FaUsers, roles: ["admin"] },
  { to: "/admin/calendar", labelKey: "admin.nav.calendar", icon: FaCalendarAlt, roles: ["admin","agency_manager"] },
  { to: "/admin/analytics", labelKey: "admin.nav.analytics", icon: FaChartBar, roles: ["admin"] },
];

const DashboardLayout = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const userRole = user?.role || (user?.isAdmin ? "admin" : "user");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const filteredItems = SIDEBAR_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-dark">
      <Header />
      <div className="lg:hidden px-4 pt-20">
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-dark-light border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300"
        >
          <span>{t("admin.title")}</span>
          <span className="text-xs text-gray-400">
            {filteredItems.length} {t("admin.nav.menu") || "menu"}
          </span>
        </button>
      </div>
      <div className="flex min-h-[calc(100vh-5rem)] lg:pt-20 pt-4">
        <aside className="w-64 bg-dark-light/50 border-r border-white/10 hidden lg:flex flex-col">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-cairo font-semibold">{t("admin.title")}</h2>
            <p className="text-sm text-gray-400 mt-1">{user?.name}</p>
            <p className="text-xs text-accent mt-1 uppercase tracking-wider">
              {t(`admin.roles.${userRole}`, userRole)}
            </p>
          </div>
          <nav className="p-4 space-y-1 flex-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-accent/20 text-accent"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="text-base" />
                  <span className="text-sm">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-white/10">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <FaSignOutAlt />
              <span className="text-sm">{t("nav.logout")}</span>
            </button>
          </div>
        </aside>
        <main className="flex-1 p-6 lg:p-8 overflow-x-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/70" onClick={() => setSidebarOpen(false)}>
          <aside className="w-64 h-full bg-dark-light/95 border-r border-white/10 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-cairo font-semibold">{t("admin.title")}</h2>
                <p className="text-sm text-gray-400 mt-1">{user?.name}</p>
                <p className="text-xs text-accent mt-1 uppercase tracking-wider">
                  {t(`admin.roles.${userRole}`, userRole)}
                </p>
              </div>
              <button type="button" className="text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>×</button>
            </div>
            <nav className="p-4 space-y-1 flex-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-accent/20 text-accent"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="text-base" />
                    <span className="text-sm">{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <FaSignOutAlt />
                <span className="text-sm">{t("nav.logout")}</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;

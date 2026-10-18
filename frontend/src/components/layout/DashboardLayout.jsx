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

  const filteredItems = SIDEBAR_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-dark">
      {/* Shared site header (also hosts the language switcher) */}
      <Header />

      <div className="flex min-h-[calc(100vh-5rem)] pt-20">
        {/* Sidebar */}
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

        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8 overflow-x-auto">
          <div className="max-w-7xl mx-auto"><Outlet /></div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

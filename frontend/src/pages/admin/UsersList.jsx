import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { usersAdminAPI } from "../../api/endpoints";
import { getApiErrorMessage } from "../../utils/apiError";
import toast from "react-hot-toast";

const ROLE_OPTIONS = ["admin", "agency_manager", "user"];

const UsersList = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      setAppliedSearch(trimmed);
      if (trimmed !== appliedSearch && pagination.page !== 1) {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, appliedSearch, pagination.page]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, appliedSearch, pagination.limit]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (appliedSearch) params.search = appliedSearch;
      const res = await usersAdminAPI.getAll(params);
      if (res.data.success) {
        setUsers(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.common.error")));
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (user) => {
    if (currentUser && user._id === currentUser._id) {
      toast.error(t("admin.users.cannotChangeOwnRole"));
      return;
    }
    setEditingUser({ _id: user._id, name: user.name, email: user.email, role: user.role });
  };

  const saveRole = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await usersAdminAPI.update(editingUser._id, { role: editingUser.role });
      toast.success(t("admin.users.roleUpdated"));
      setEditingUser(null);
      await fetchUsers();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.common.error")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (currentUser && user._id === currentUser._id) {
      toast.error(t("admin.users.cannotDeleteSelf"));
      return;
    }
    if (!window.confirm(t("admin.users.confirmDelete"))) return;
    try {
      await usersAdminAPI.delete(user._id);
      toast.success(t("admin.users.userDeleted"));
      await fetchUsers();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.common.error")));
    }
  };

  const changePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-cairo font-bold mb-2">{t("admin.users.title")}</h1>
        <p className="text-gray-400">{t("admin.users.subtitle")}</p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t("admin.users.searchPlaceholder")}
          className="w-full max-w-md bg-dark-light border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div className="bg-dark-light/50 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.common.name")}</th>
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.common.email")}</th>
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.common.role")}</th>
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.common.status")}</th>
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.actions.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-gray-400">
                  {t("admin.users.noUsers")}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="border-b border-white/5">
                  <td className="p-4">{u.name}</td>
                  <td className="p-4 text-sm">{u.email}</td>
                  <td className="p-4 text-sm">{t(`admin.roles.${u.role}`, u.role)}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        u.isActive !== false ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {u.isActive !== false ? t("admin.common.active") : t("admin.common.inactive")}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="px-3 py-1 text-xs bg-dark border border-white/10 rounded hover:border-accent transition-colors"
                      >
                        {t("admin.actions.edit")}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="px-3 py-1 text-xs bg-dark border border-red-500/40 text-red-400 rounded hover:border-red-500 transition-colors"
                      >
                        {t("admin.actions.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => changePage(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-4 py-2 bg-dark-light border border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("admin.actions.previous")}
          </button>
          <span className="text-sm text-gray-400">
            {pagination.page} / {pagination.pages}
          </span>
          <button
            onClick={() => changePage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="px-4 py-2 bg-dark-light border border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("admin.actions.next")}
          </button>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-light border border-white/10 rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold">{t("admin.users.editUser")}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {editingUser.name} • {editingUser.email}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t("admin.common.role")}</label>
                <select
                  className="w-full bg-dark border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`admin.roles.${r}`, r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
              <button
                disabled={saving}
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-dark border border-white/10 rounded-lg disabled:opacity-50"
              >
                {t("admin.actions.cancel")}
              </button>
              <button
                disabled={saving}
                onClick={saveRole}
                className="px-4 py-2 bg-accent rounded-lg disabled:opacity-50"
              >
                {saving ? t("admin.actions.saving") : t("admin.actions.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;

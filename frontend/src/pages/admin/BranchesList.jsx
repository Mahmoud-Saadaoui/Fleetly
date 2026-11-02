import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { branchesAPI } from "../../api/endpoints";
import { getApiErrorMessage } from "../../utils/apiError";
import toast from "react-hot-toast";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

const BranchesList = () => {
  const { t } = useTranslation();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const fetchBranches = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (search.trim()) params.search = search.trim();
      const res = await branchesAPI.getAll(params);
      if (res.data.success) {
        setBranches(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t("admin.common.error")));
      toast.error(t("admin.common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    fetchBranches();
  };

  const handleDelete = async (id) => {
    if (!confirm(t("admin.branches.deleteConfirm"))) return;
    setDeletingId(id);
    try {
      await branchesAPI.delete(id);
      toast.success(t("admin.branches.deleted"));
      fetchBranches();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("admin.common.error")));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && branches.length === 0) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-cairo font-bold mb-2">{t("admin.branches.title")}</h1>
          <p className="text-gray-400">{t("admin.branches.subtitle")}</p>
        </div>
        <Link to="/admin/branches/new" className="flex items-center gap-2 px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-light">
          <FaPlus /> {t("admin.actions.add")}
        </Link>
      </div>
      {error && <div className="mb-4 text-red-400">{error}</div>}
      {loading && branches.length > 0 && <div className="mb-4 text-sm text-gray-400">{t("common.loading")}</div>}

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.common.search") || "Search"}
          className="px-3 py-2 bg-dark border border-white/10 rounded-lg text-white max-w-md"
        />
        <button type="submit" className="px-4 py-2 bg-accent text-dark rounded-lg">{t("admin.common.search")}</button>
      </form>

      <div className="bg-dark-light/50 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.branches.name")}</th>
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.branches.code")}</th>
              <th className="text-left text-xs text-gray-400 p-4">{t("admin.branches.city")}</th>
              <th className="text-right text-xs text-gray-400 p-4">{t("admin.actions.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-gray-400">{t("admin.common.noResults")}</td>
              </tr>
            ) : branches.map(b => (
              <tr key={b._id} className="border-b border-white/5">
                <td className="p-4">{b.name}</td>
                <td className="p-4 text-sm">{b.code}</td>
                <td className="p-4 text-sm">{b.address?.city}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link to={`/admin/branches/${b._id}/edit`} className="p-2 text-gray-400 hover:text-white"><FaEdit /></Link>
                    <button onClick={() => handleDelete(b._id)} disabled={deletingId === b._id} className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-50"><FaTrash /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BranchesList;

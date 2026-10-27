import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { branchesAPI } from "../../api/endpoints";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../../utils/apiError";

const BranchesForm = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== "new";
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "", code: "", address: { street: "", city: "", postalCode: "", country: "FR" }, phone: "", email: ""
  });

  useEffect(() => {
    if (isEdit) fetchBranch();
  }, [id]);

  const fetchBranch = async () => {
    try {
      const res = await branchesAPI.getById(id);
      if (res.data.success) {
        const found = res.data.data;
        if (found) setFormData(found);
      }
    } catch {
      toast.error(t("admin.common.error"));
      navigate("/admin/branches");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    if (e.target.name.startsWith("address.")) {
      const key = e.target.name.split(".")[1];
      setFormData({ ...formData, address: { ...formData.address, [key]: e.target.value } });
    } else if (e.target.type === "checkbox") {
      setFormData({ ...formData, [e.target.name]: e.target.checked });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formData, address: { ...formData.address } };
      // Drop empty optional fields so validators treating "" as invalid don't reject.
      ["phone", "email"].forEach((field) => {
        if (!payload[field]) delete payload[field];
      });
      ["street", "postalCode"].forEach((field) => {
        if (!payload.address[field]) delete payload.address[field];
      });

      if (isEdit) {
        await branchesAPI.update(id, payload);
        toast.success(t("admin.branches.updated"));
      } else {
        await branchesAPI.create(payload);
        toast.success(t("admin.branches.created"));
      }
      navigate("/admin/branches");
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("admin.common.error")));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-cairo font-bold">{t(isEdit ? "admin.branches.editTitle" : "admin.branches.addTitle")}</h1>
      </div>
      <div className="bg-dark-light/50 border border-white/10 rounded-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t("admin.branches.name")}</label>
              <input name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t("admin.branches.code")}</label>
              <input name="code" value={formData.code} onChange={handleChange} required className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t("admin.branches.city")}</label>
              <input name="address.city" value={formData.address.city} onChange={handleChange} required className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t("admin.branches.postalCode")}</label>
              <input name="address.postalCode" value={formData.address.postalCode} onChange={handleChange} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t("admin.branches.street")}</label>
              <input name="address.street" value={formData.address.street} onChange={handleChange} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t("admin.branches.phone")}</label>
              <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white" />
            </div>
          </div>
          <div className="flex gap-4">
            <button type="submit" disabled={submitting} className="px-6 py-3 bg-accent text-dark rounded-lg disabled:opacity-50">
              {t(submitting ? "admin.actions.saving" : "admin.actions.save")}
            </button>
            <button type="button" onClick={() => navigate("/admin/branches")} className="px-6 py-3 border border-white/20 rounded-lg">
              {t("admin.actions.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchesForm;

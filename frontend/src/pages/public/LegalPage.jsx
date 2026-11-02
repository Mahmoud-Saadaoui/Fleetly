import { useTranslation } from "react-i18next";
import { useSearchParams, Link } from "react-router-dom";

const LegalPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const section = searchParams.get("section") || "legal";

  const getTitle = () => {
    if (section === "privacy") return t("home.footer.privacyPolicy");
    if (section === "terms") return t("home.footer.termsConditions");
    if (section === "faq") return t("home.footer.faq");
    return t("home.footer.legalNotice");
  };

  return (
    <div className="min-h-screen bg-dark px-6 pt-24 pb-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-cairo font-bold mb-6">
          {getTitle()} <span className="text-accent">Fleetly</span>
        </h1>
        <div className="bg-dark-light/50 border border-white/10 rounded-2xl p-8 text-gray-300 space-y-4">
          <p>Fleetly - Location de véhicules de luxe.</p>
          <p>SIRET : 000 000 000 00000 | Siège social : Tunis, Tunisie</p>
          <p>Hébergement et traitement des données conformes aux lois applicables.</p>
          <p>Pour toute question : contact@fleetly.com</p>
        </div>
        <div className="mt-6">
          <Link to="/" className="text-accent underline">{t("common.backHome") || "Back to home"}</Link>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;

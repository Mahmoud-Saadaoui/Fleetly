import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const sectionsRef = useRef([]);
  const [search, setSearch] = useState({
    branch: "",
    startDate: "",
    endDate: ""
  });

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      () => {},
      { threshold: 0.3 }
    );

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const fleetCars = [
    { key: "gt3", price: "350€", image: "/cars/side-1.jpg" },
    { key: "panamera", price: "280€", image: "/cars/side-2.jpg" },
    { key: "classic", price: "400€", image: "/cars/side-3.jpg" },
  ];

  const features = [
    {
      key: "insurance",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      key: "delivery",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      key: "online",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-dark text-white overflow-x-hidden">
      {/* Hero Section */}
      <section
        ref={(el) => (sectionsRef.current[0] = el)}
        data-index="0"
        className="relative min-h-screen flex items-center justify-center pt-20"
      >
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url(/cars/hero-porsche.jpg)" }} />
        <div className="absolute inset-0 bg-linear-to-b from-dark/90 via-dark/60 to-dark" />
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <h1
            className={`text-5xl md:text-7xl lg:text-8xl font-cairo font-extrabold uppercase tracking-tight mb-6 transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <span className="bg-linear-to-r from-gray-400 via-white to-gray-400 bg-clip-text text-transparent">
              {t("home.hero.titleLine1")}
            </span>
            <br />
            <span className="bg-linear-to-r from-gray-400 via-white to-gray-400 bg-clip-text text-transparent">
              {t("home.hero.titleLine2")}
            </span>
          </h1>
          <p
            className={`text-lg md:text-xl font-cairo font-light text-gray-300 mb-12 max-w-2xl mx-auto transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            {t("home.hero.subtitle")}
          </p>
          <div
            className={`flex flex-col sm:flex-row gap-4 justify-center mb-16 transition-all duration-1000 delay-500 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <Link
              to="/vehicles"
              className="px-8 py-4 bg-accent text-dark font-semibold rounded-full hover:bg-accent-light transition-all hover:scale-105"
            >
              {t("home.hero.exploreFleet")}
            </Link>
            <Link
              to="/about"
              className="px-8 py-4 border border-white/30 text-white font-semibold rounded-full hover:bg-white/10 transition-all"
            >
              {t("home.hero.learnMore")}
            </Link>
          </div>

          {/* Search Widget */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const params = new URLSearchParams();
              if (search.branch) params.set('branch', search.branch);
              if (search.startDate) params.set('from', search.startDate);
              if (search.endDate) params.set('to', search.endDate);
              navigate(`/vehicles${params.toString() ? `?${params.toString()}` : ''}`);
            }}
            className={`bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 max-w-4xl mx-auto transition-all duration-1000 delay-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-start">
                <label className="text-xs text-gray-400 uppercase tracking-wider">{t("home.hero.pickupLocation")}</label>
                <input
                  type="text"
                  value={search.branch}
                  onChange={(e) => setSearch((s) => ({ ...s, branch: e.target.value }))}
                  placeholder={t("home.hero.pickupPlaceholder")}
                  className="w-full mt-2 bg-transparent border-b border-white/20 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="text-start">
                <label className="text-xs text-gray-400 uppercase tracking-wider">{t("home.hero.startDate")}</label>
                <input
                  type="datetime-local"
                  value={search.startDate}
                  onChange={(e) => setSearch((s) => ({ ...s, startDate: e.target.value }))}
                  className="w-full mt-2 bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="text-start">
                <label className="text-xs text-gray-400 uppercase tracking-wider">{t("home.hero.endDate")}</label>
                <input
                  type="datetime-local"
                  value={search.endDate}
                  onChange={(e) => setSearch((s) => ({ ...s, endDate: e.target.value }))}
                  className="w-full mt-2 bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full py-3 bg-accent text-dark font-semibold rounded-lg hover:bg-accent-light transition-colors">
                  {t("home.hero.search")}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-white/50 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section
        ref={(el) => (sectionsRef.current[1] = el)}
        data-index="1"
        className="py-32 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-cairo font-light mb-4">
              {t("home.experience.title")} <span className="font-bold">{t("home.experience.titleAccent")}</span>
            </h2>
            <p className="text-gray-400 font-cairo">{t("home.experience.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-2xl font-cairo font-normal">
                {t("home.experience.heading")}
              </h3>
              <p className="text-gray-400 font-cairo leading-relaxed">
                {t("home.experience.text")}
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 text-accent hover:text-accent-light transition-colors group"
              >
                <span className="font-cairo">{t("home.experience.contactUs")}</span>
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform rtl:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-3/4">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url(/cars/vertical-porsche.jpg)" }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-dark/90 via-dark/20 to-transparent" />
              <div className="absolute bottom-6 start-6 end-6">
                <p className="text-sm text-gray-200 font-cairo italic">
                  {t("home.experience.quote")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet Section */}
      <section
        ref={(el) => (sectionsRef.current[2] = el)}
        data-index="2"
        className="py-32 px-6 bg-dark-light/50"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-cairo font-light mb-4">
              {t("home.fleet.title")} <span className="font-bold">{t("home.fleet.titleAccent")}</span>
            </h2>
            <p className="text-gray-400 font-cairo">{t("home.fleet.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {fleetCars.map((car) => (
              <div
                key={car.key}
                className="group bg-dark border border-white/10 rounded-2xl overflow-hidden hover:border-accent/50 transition-all duration-500 hover:-translate-y-2"
              >
                <div className="aspect-16/10 relative overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700"
                    style={{ backgroundImage: `url(${car.image})` }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-dark via-dark/30 to-transparent opacity-80" />
                  <div className="absolute top-4 start-4">
                    <span className="px-3 py-1 bg-accent/20 text-accent text-xs font-semibold rounded-full backdrop-blur-sm">
                      {t(`home.fleet.${car.key}.category`)}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-cairo font-semibold mb-2 group-hover:text-accent transition-colors">
                    {t(`home.fleet.${car.key}.name`)}
                  </h3>
                  <p className="text-gray-400 text-sm font-cairo mb-4">{t(`home.fleet.${car.key}.description`)}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500">{t("home.fleet.from")}</span>
                      <p className="text-2xl font-bold text-accent">{car.price}{t("home.fleet.perDay")}</p>
                    </div>
                    <Link
                      to="/vehicles"
                      className="px-4 py-2 border border-white/20 text-sm rounded-full hover:bg-white/10 transition-colors"
                    >
                      {t("home.fleet.viewDetails")}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: "url(/cars/stripe-porsche.jpg)" }}
        />
        <div className="absolute inset-0 bg-dark/80" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-cairo font-bold mb-6">
            {t("home.cta.title")} <span className="text-accent">{t("home.cta.titleAccent")}</span>?
          </h2>
          <p className="text-lg text-gray-300 font-cairo mb-10 max-w-2xl mx-auto">
            {t("home.cta.text")}
          </p>
          <Link
            to="/vehicles"
            className="inline-block px-10 py-4 bg-accent text-dark font-semibold rounded-full hover:bg-accent-light transition-all hover:scale-105"
          >
            {t("home.cta.button")}
          </Link>
        </div>
      </section>

      {/* Why Choose Us */}
      <section
        ref={(el) => (sectionsRef.current[3] = el)}
        data-index="3"
        className="py-32 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-cairo font-light mb-4">
              {t("home.why.title")} <span className="font-bold">{t("home.why.titleAccent")}</span>?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="text-center p-8 border border-white/10 rounded-2xl hover:border-accent/30 transition-all duration-500"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-cairo font-semibold mb-3">{t(`home.why.${feature.key}Title`)}</h3>
                <p className="text-gray-400 font-cairo">{t(`home.why.${feature.key}Text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        ref={(el) => (sectionsRef.current[4] = el)}
        data-index="4"
        className="py-32 px-6 bg-dark-light/50"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-cairo font-light mb-16">
            {t("home.testimonials.title")} <span className="font-bold">{t("home.testimonials.titleAccent")}</span>
          </h2>
          <blockquote className="text-2xl md:text-3xl font-cairo font-light italic text-gray-300 mb-8">
            {t("home.testimonials.quote")}
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
              {t("home.testimonials.author").charAt(0)}
            </div>
            <div className="text-start">
              <p className="font-semibold">{t("home.testimonials.author")}</p>
              <p className="text-sm text-gray-400">{t("home.testimonials.role")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <Link to="/" className="text-2xl font-bold font-cairo tracking-tight">
                Fleet<span className="text-accent">ly</span>
              </Link>
              <p className="mt-4 text-gray-400 text-sm font-cairo">
                {t("home.footer.tagline")}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("home.footer.quickLinks")}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">{t("home.footer.legalNotice")}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t("home.footer.privacyPolicy")}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t("home.footer.faq")}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t("home.footer.termsConditions")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("home.footer.followUs")}</h4>
              <div className="flex gap-4">
                {["Instagram", "LinkedIn", "Facebook"].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/40 transition-colors"
                  >
                    <span className="text-xs">{social[0]}</span>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("home.footer.newsletter")}</h4>
              <p className="text-sm text-gray-400 mb-4">
                {t("home.footer.newsletterText")}
              </p>
              <div className="flex">
                <input
                  type="email"
                  placeholder={t("home.footer.emailPlaceholder")}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-s-lg text-sm focus:outline-none focus:border-accent"
                />
                <button className="px-4 py-2 bg-accent text-dark rounded-e-lg hover:bg-accent-light transition-colors">
                  {t("home.footer.ok")}
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-sm text-gray-500">
            <p>{t("home.footer.rights", { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

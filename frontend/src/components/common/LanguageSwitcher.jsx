import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaGlobe } from "react-icons/fa";

const LANGUAGES = [
  { code: "fr", label: "Français", short: "FR" },
  { code: "en", label: "English", short: "EN" },
  { code: "ar", label: "العربية", short: "ع" },
];

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current =
    LANGUAGES.find((lang) => lang.code?.split("-")[0] === i18n.language?.split("-")[0]) ??
    LANGUAGES[0];

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/20 text-sm font-cairo text-gray-300 hover:text-white hover:border-white/40 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.label")}
      >
        <FaGlobe className="text-accent" />
        <span>{current.short}</span>
      </button>
      {open && (
        <ul
          className="absolute end-0 top-full mt-2 min-w-40 max-w-[calc(100vw-1rem)] rounded-lg border border-white/10 bg-dark-light shadow-xl overflow-hidden z-50"
          role="listbox"
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                onClick={() => changeLanguage(lang.code)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-start text-sm font-cairo hover:bg-white/5 transition-colors ${
                  lang.code === current.code ? "text-accent font-semibold" : "text-gray-300"
                }`}
                role="option"
                aria-selected={lang.code === current.code}
              >
                <span>{lang.label}</span>
                <span className="text-xs text-gray-500">{lang.short}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageSwitcher;

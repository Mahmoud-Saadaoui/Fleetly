import { format, parseISO } from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';
import i18n from '../config/i18n';

const DATE_LOCALES = {
  fr,
  en: enUS,
  ar,
};

const getLang = () => {
  try {
    const stored = typeof localStorage !== 'undefined' && localStorage.getItem('i18nextLng');
    return (stored || i18n.language || 'fr').split('-')[0];
  } catch {
    return (i18n.language || 'fr').split('-')[0];
  }
};

const getLocale = () => {
  const lang = getLang();
  return DATE_LOCALES[lang] || fr;
};

const getIntlLocale = () => {
  const lang = getLang();
  if (lang === 'ar') return 'ar';
  if (lang === 'en') return 'en-US';
  return 'fr-FR';
};

export const formatCurrency = (cents, currency = 'EUR') => {
  if (cents === null || cents === undefined) {
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(0);
    } catch {
      return '0,00 €';
    }
  }
  try {
    return new Intl.NumberFormat(getIntlLocale(), {
      style: 'currency',
      currency,
    }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  }
};

export const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMMM yyyy', { locale: getLocale() });
  } catch {
    return '';
  }
};

export const formatDateTime = (date) => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy HH:mm', { locale: getLocale() });
  } catch {
    return '';
  }
};

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('fr-FR').format(num);
};

const mongoose = require('mongoose');

const escapeRegex = (term) => {
  if (typeof term !== 'string') return '';
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const sanitizeSearchTerm = (term, maxLength = 60) => {
  if (typeof term !== 'string') return null;
  const trimmed = term.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) return false;
  return trimmed;
};

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

const parseDateSafe = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date;
};

module.exports = { escapeRegex, sanitizeSearchTerm, isValidObjectId, parseDateSafe };

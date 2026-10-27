const ALLOWED_TRANSITIONS = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['active', 'cancelled', 'no_show'],
  active: ['completed', 'cancelled']
};

const TERMINAL_STATUSES = ['completed', 'cancelled', 'no_show'];

const canTransition = (from, to) => {
  if (!from || !to || from === to) return false;
  if (TERMINAL_STATUSES.includes(from)) return false;
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
};

const getAllowedTransitions = (from) => {
  if (!from || TERMINAL_STATUSES.includes(from)) return [];
  return ALLOWED_TRANSITIONS[from] || [];
};

module.exports = {
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
  canTransition,
  getAllowedTransitions
};

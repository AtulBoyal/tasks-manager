const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' in the user's local timezone.
// Use this instead of toISOString().split('T')[0], which gives the UTC date
// (e.g. before 05:30 in India it returns yesterday).
export const getLocalDateString = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Parses 'YYYY-MM-DD' as local midnight (new Date('YYYY-MM-DD') parses as UTC).
// Full ISO timestamps are parsed normally.
export const parseLocalDate = (value) => {
  if (!value) return null;
  if (DATE_ONLY.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
};

export const formatDate = (isoDate) => {
  const date = parseLocalDate(isoDate);
  if (!date || Number.isNaN(date.getTime())) return '';

  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
};

export const getFactorClass = (factor) => {
  if (factor === 'Later')
    return 'bg-emerald-500 dark:bg-emerald-600 text-white';

  if (factor === 'Normal')
    return 'bg-amber-500 dark:bg-amber-600 text-white';

  if (factor === 'Urgent')
    return 'bg-red-500 dark:bg-red-600 text-white';

  return '';
};

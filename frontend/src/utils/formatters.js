export const formatDate = (isoDate) => {
  if (!isoDate) return '';

  const date = new Date(isoDate);

  return `${String(date.getDate()).padStart(2, '0')}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}-${date.getFullYear()}`;
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
const WEEKDAYS = '日月火水木金土';

export function formatDateJa(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}月${d}日(${WEEKDAYS[dt.getDay()]})`;
}

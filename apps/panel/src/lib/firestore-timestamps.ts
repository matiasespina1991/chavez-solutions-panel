import { isRecord } from '@/lib/runtime-guards';

const formatDateForUi = (date: Date, locale: string) => {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const datePart = dateFormatter.format(date).replace(',', '');
  const normalizedDatePart =
    datePart.charAt(0).toUpperCase() + datePart.slice(1);
  const timePart = timeFormatter.format(date);

  return `${normalizedDatePart}, ${timePart} hs`;
};

const toDate = (value: unknown): Date | null => {
  if (!isRecord(value) || !('toDate' in value)) {
    return null;
  }

  try {
    return (value as { toDate: () => Date }).toDate();
  } catch {
    return null;
  }
};

export const formatFirestoreTimestamp = (
  value: unknown,
  locale = 'es-EC'
): string => {
  const date = toDate(value);
  if (!date) return '—';
  return formatDateForUi(date, locale);
};

export const firestoreTimestampToMs = (value: unknown): number => {
  const date = toDate(value);
  if (!date) return 0;
  return date.getTime();
};

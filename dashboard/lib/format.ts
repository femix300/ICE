const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
});

export const formatKoboToNaira = (kobo: number | undefined | null): string =>
  nairaFormatter.format((kobo ?? 0) / 100);

export const formatReconciliationRate = (rate: number | undefined | null): string =>
  `${(rate ?? 0).toFixed(1)}%`;

export const formatTimestamp = (value: string | undefined | null): string => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const datePart = date.toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart} · ${timePart}`;
};

export const formatDate = (value: Date | string | undefined | null): string => {
  const date =
    typeof value === 'string' && value ? new Date(value) : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

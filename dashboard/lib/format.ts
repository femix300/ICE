const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
});

export const formatKoboToNaira = (kobo: number): string => nairaFormatter.format(kobo / 100);

export const formatReconciliationRate = (rate: number): string => `${rate.toFixed(1)}%`;

export const formatTimestamp = (value: string): string => {
  const date = new Date(value);
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

export const formatDate = (value: Date | string): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

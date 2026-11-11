export function money(amount) {
  if (!amount || typeof amount.value !== 'string' || !amount.currencyCode)
    return '—';
  // Keep monetary values as decimal strings; do not convert to floating point.
  const [whole, fraction = ''] = amount.value.split('.');
  return `${amount.currencyCode} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`;
}
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';
export const label = (value) =>
  value
    ? value
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/^./, (char) => char.toUpperCase())
    : '—';
export const transactionName = (transaction) =>
  transaction.paypalCaptureId || transaction.id;

export function transactionSubtitle(transaction) {
  const reference =
    transaction.order?.externalId ||
    transaction.merchantOrderReference ||
    'No linked order';
  const count = transaction.order?.items.every((item) =>
    Number.isInteger(item.quantity),
  )
    ? transaction.order.items.reduce((total, item) => total + item.quantity, 0)
    : null;
  return count
    ? `${reference} · ${count} ${count === 1 ? 'item' : 'items'}`
    : reference;
}

export const disputeReference = (transaction) =>
  `DIS-${transaction.paypalCaptureId.replace(/\D/g, '')}`;

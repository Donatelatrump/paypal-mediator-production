export const MAX_EVIDENCE_FILE_BYTES = 512 * 1024;
export function canUseRun(run, revision) {
  return Boolean(
    run &&
    run.status === 'COMPLETED' &&
    run.result &&
    !run.stale &&
    !run.expired &&
    Date.parse(run.expiresAt) > Date.now() &&
    run.evidenceRevision === revision,
  );
}
export function activityCategory(event) {
  return event.module === 'M05'
    ? 'Investigation'
    : event.module === 'M06'
      ? 'Verification'
      : 'Review';
}
export function notificationFromActivity(event) {
  return {
    id: event.id,
    merchantId: event.merchantId,
    title: event.action
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/^./, (char) => char.toUpperCase()),
    detail: event.record?.details?.errorCode || event.outcome.toLowerCase(),
    createdAt: event.createdAt,
    icon:
      event.module === 'M05'
        ? 'Star'
        : event.module === 'M06'
          ? 'ShieldCheck'
          : 'Bell',
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    transactionId: event.transactionId,
    event,
  };
}
export function evidenceFilename(name) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,127}$/.test(name);
}
export async function evidenceUploadBody(file) {
  if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type))
    throw new Error('Choose a PDF, PNG, or JPEG file.');
  if (file.size < 1 || file.size > MAX_EVIDENCE_FILE_BYTES)
    throw new Error('Each file must be between 1 byte and 512 KB.');
  if (!evidenceFilename(file.name))
    throw new Error(
      'Use a filename of up to 128 letters, numbers, spaces, periods, underscores, or hyphens, starting with a letter or number.',
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const sha256 = Array.from(hash, (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return {
    sourceKind: 'MERCHANT_INPUT',
    sourceSystem: 'Merchant upload',
    externalReference: `file:${sha256}`,
    retrievedAt: new Date().toISOString(),
    fileName: file.name,
    mediaType: file.type,
    dataBase64: btoa(binary),
  };
}

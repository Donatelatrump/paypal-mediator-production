// All private operations go through the authorized backend, never Supabase tables.
export function createApi({ baseUrl, getAccessToken }) {
  const root = baseUrl.replace(/\/$/, '');
  async function request(path, { responseType, ...options } = {}) {
    const token = await getAccessToken();
    if (!token)
      throw Object.assign(new Error('Sign in to continue.'), { status: 401 });
    let response;
    try {
      response = await fetch(`${root}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
    } catch (cause) {
      if (cause.name === 'AbortError') throw cause;
      throw Object.assign(
        new Error(
          'Could not reach the server. Check your connection and try again.',
        ),
        { code: 'NETWORK_ERROR', cause },
      );
    }
    if (responseType === 'blob' && response.ok) return response.blob();
    const raw = response.status === 204 ? '' : await response.text();
    let body;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = null;
    }
    if (!response.ok)
      throw Object.assign(
        new Error(body?.message || `Request failed (${response.status}).`),
        {
          status: response.status,
          code: body?.code,
          requestId: body?.requestId || response.headers.get('X-Request-Id'),
        },
      );
    if (raw && !body)
      throw Object.assign(
        new Error('The server returned an unexpected response.'),
        { code: 'INVALID_RESPONSE' },
      );
    return body;
  }
  const get = (path, signal) => request(path, { signal });
  const post = (path, body, signal) =>
    request(path, {
      method: 'POST',
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal,
    });
  const id = encodeURIComponent;
  const query = (values, keys) =>
    new URLSearchParams(
      Object.fromEntries(
        keys
          .filter((key) => values[key] !== undefined && values[key] !== '')
          .map((key) => [key, values[key]]),
      ),
    ).toString();
  const investigationsPath = (transactionId) =>
    `/transactions/${id(transactionId)}/investigations`;
  const verificationsPath = (transactionId, investigationId) =>
    `${investigationsPath(transactionId)}/${id(investigationId)}/verifications`;
  return {
    merchant: (signal) => get('/merchants/me', signal),
    merchants: (signal) => get('/merchants', signal),
    integrations: (signal) => get('/settings/integrations', signal),
    transactions: ({ page = 1, pageSize = 20, paypalCaptureId } = {}, signal) =>
      get(
        `/transactions?${query({ page, pageSize, paypalCaptureId }, ['page', 'pageSize', 'paypalCaptureId'])}`,
        signal,
      ),
    transaction: (transactionId, signal) =>
      get(`/transactions/${id(transactionId)}`, signal),
    evidence: (transactionId, signal) =>
      get(`/transactions/${id(transactionId)}/evidence`, signal),
    updateMerchant: (body) =>
      request('/merchants/me/settings', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    checkPayPal: () => post('/settings/integrations/paypal/check'),
    refreshEvidence: (transactionId) =>
      post(`/transactions/${id(transactionId)}/refresh-evidence`),
    refreshOrderSources: (transactionId) =>
      post(`/transactions/${id(transactionId)}/refresh-order-sources`),
    registerOrder: (body) => post('/orders', body),
    registerEvidence: (transactionId, body) =>
      post(`/transactions/${id(transactionId)}/evidence`, body),
    uploadEvidence: (transactionId, body) =>
      post(`/transactions/${id(transactionId)}/evidence/files`, body),
    downloadEvidence: (transactionId, evidenceId) =>
      request(
        `/transactions/${id(transactionId)}/evidence/files/${id(evidenceId)}`,
        { responseType: 'blob' },
      ),
    disputes: (params = {}, signal) =>
      get(
        `/disputes?${query({ page: 1, pageSize: 20, ...params }, ['page', 'pageSize', 'internalState', 'paypalStatus'])}`,
        signal,
      ),
    dispute: (disputeId, signal) => get(`/disputes/${id(disputeId)}`, signal),
    investigations: (transactionId, signal) =>
      get(investigationsPath(transactionId), signal),
    startInvestigation: (transactionId, idempotencyKey) =>
      post(investigationsPath(transactionId), { idempotencyKey }),
    investigation: (transactionId, runId, signal) =>
      get(`${investigationsPath(transactionId)}/${id(runId)}`, signal),
    verifications: (transactionId, investigationId, signal) =>
      get(verificationsPath(transactionId, investigationId), signal),
    startVerification: (transactionId, investigationId, idempotencyKey) =>
      post(verificationsPath(transactionId, investigationId), {
        idempotencyKey,
      }),
    verification: (transactionId, investigationId, runId, signal) =>
      get(
        `${verificationsPath(transactionId, investigationId)}/${id(runId)}`,
        signal,
      ),
    submitDispute: (disputeId, idempotencyKey) =>
      post(`/disputes/${id(disputeId)}/submit`, { idempotencyKey }),
    activity: (params = {}, signal) =>
      get(
        `/activity?${query(params, ['limit', 'before', 'beforeId', 'module', 'action', 'outcome', 'transactionId', 'resourceId', 'resourceType', 'from', 'to'])}`,
        signal,
      ),
    metrics: (hours = 24, signal) =>
      get(`/activity/metrics?hours=${hours}`, signal),
    plans: (signal) => get('/billing/plans', signal),
    subscription: (signal) => get('/billing/subscription', signal),
    subscribe: (planId) => post('/billing/subscription', { planId }),
    erpCatalog: (signal) => get('/integrations/catalog', signal),
    erpConnections: (signal) => get('/integrations', signal),
    connectErp: (provider, apiKey, baseUrl) =>
      post(`/integrations/${id(provider)}/connect-with-key`, {
        provider,
        apiKey,
        ...(baseUrl ? { baseUrl } : {}),
      }),
    syncErp: (connectionId) =>
      post(`/integrations/${id(connectionId)}/sync`, { connectionId }),
    disconnectErp: (connectionId) =>
      post(`/integrations/${id(connectionId)}/disconnect`),
  };
}

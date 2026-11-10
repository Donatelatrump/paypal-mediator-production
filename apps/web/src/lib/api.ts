import { createClient } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://resolve-ai-api-ybmj.onrender.com';

async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No authentication token available. Please sign in.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(body.message || 'Request failed') as Error & {
      status: number;
      code?: string;
      requestId?: string;
    };
    error.status = response.status;
    error.code = body.code;
    error.requestId = body.requestId;
    throw error;
  }

  return body as T;
}

export const api = {
  // Health
  health: () => request<{ status: string; service: string; environment: string; timestamp: string }>('/api/health'),
  readiness: () => request<{ status: 'ready' | 'not_ready'; checks: { database: 'up' | 'down' }; timestamp: string }>('/api/health/ready'),

  // Merchants
  getMe: () => request<{
    id: string;
    displayName: string;
    role: 'ADMIN' | 'VIEWER';
    policy: {
      allowInvestigations: boolean;
      allowSubmissions: boolean;
      requireMerchantApproval: boolean;
    };
    integration: {
      provider: string;
      environment: string;
      credentialsConfigured: boolean;
      webhookConfigured: boolean;
      connectionStatus: string;
      disputesReadStatus: string;
      lastCheckedAt: string | null;
      paypalHttpStatus: number | null;
      paypalDebugId: string | null;
      source: string;
    };
  }>('/api/merchants/me'),

  updateSettings: (body: { displayName?: string; contactName?: string; email?: string; phone?: string; timezone?: string }) =>
    request<{ id: string; displayName: string; contactName: string; email: string; phone: string; timezone: string }>(
      '/api/merchants/me/settings',
      { method: 'PATCH', body: JSON.stringify(body) }
    ),

  // Integrations
  getIntegrations: () => request<{
    provider: string;
    environment: string;
    credentialsConfigured: boolean;
    webhookConfigured: boolean;
    connectionStatus: string;
    disputesReadStatus: string;
    lastCheckedAt: string | null;
    paypalHttpStatus: number | null;
    paypalDebugId: string | null;
    source: string;
  }>('/api/settings/integrations'),

  checkPayPal: () => request<{
    connectionStatus: string;
    disputesReadStatus: string;
    lastCheckedAt: string;
    paypalHttpStatus: number;
    paypalDebugId: string;
  }>('/api/settings/integrations/paypal/check', { method: 'POST' }),

  // Transactions
  listTransactions: (params?: { page?: number; pageSize?: number; paypalCaptureId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.paypalCaptureId) searchParams.set('paypalCaptureId', params.paypalCaptureId);
    return request<{
      items: Transaction[];
      page: number;
      pageSize: number;
      total: number;
    }>(`/api/transactions?${searchParams.toString()}`);
  },

  getTransaction: (id: string) =>
    request<Transaction>(`/api/transactions/${encodeURIComponent(id)}`),

  getEvidence: (id: string) =>
    request<EvidenceDossier>(`/api/transactions/${encodeURIComponent(id)}/evidence`),

  refreshEvidence: (id: string) =>
    request<{ jobId: string; status: string }>(
      `/api/transactions/${encodeURIComponent(id)}/refresh-evidence`,
      { method: 'POST' }
    ),

  // Orders
  registerOrder: (body: {
    externalId: string;
    paypalOrderId: string;
    sourceKind: 'DEMO' | 'ERP';
    sourceSystem: string;
    currencyCode: string;
    totalAmount: string;
    shippingAmount: string;
    taxAmount: string;
    discountAmount: string;
    orderedAt: string;
    items: Array<{ sku: string; description: string; quantity: number; unitAmount: string }>;
  }) =>
    request<{
      id: string;
      merchantId: string;
      environment: string;
      externalId: string;
      paypalOrderId: string;
      sourceKind: string;
      sourceSystem: string;
      currencyCode: string;
      totalAmount: string;
      shippingAmount: string;
      taxAmount: string;
      discountAmount: string;
      orderedAt: string;
      items: Array<{ sku: string; description: string; quantity: number; unitAmount: string }>;
      contentHash: string;
      createdAt: string;
    }>('/api/orders', { method: 'POST', body: JSON.stringify(body) }),

  // Disputes
  listDisputes: () =>
    request<Dispute[]>(`/api/disputes`),

  getDispute: (id: string) =>
    request<Dispute>(`/api/disputes/${encodeURIComponent(id)}`),

  investigateDispute: (id: string) =>
    request<{ jobId: string; status: string }>(
      `/api/disputes/${encodeURIComponent(id)}/investigate`,
      { method: 'POST' }
    ),

  approveDispute: (id: string) =>
    request<{ approved: boolean }>(
      `/api/disputes/${encodeURIComponent(id)}/approve`,
      { method: 'POST' }
    ),

  submitDispute: (id: string) =>
    request<{ status: 'SUBMITTED' | 'BLOCKED' | 'FAILED'; paypalRequestId?: string; message?: string }>(
      `/api/disputes/${encodeURIComponent(id)}/submit`,
      { method: 'POST' }
    ),

  // Activity / Monitoring
  getActivity: (params?: { page?: number; pageSize?: number; merchantId?: string; from?: string; to?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.merchantId) searchParams.set('merchantId', params.merchantId);
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    return request<{
      items: ActivityEvent[];
      page: number;
      pageSize: number;
      total: number;
    }>(`/api/activity?${searchParams.toString()}`);
  },

  getMetrics: (params?: { merchantId?: string; from?: string; to?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.merchantId) searchParams.set('merchantId', params.merchantId);
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    return request<ActivityMetrics>(`/api/activity/metrics?${searchParams.toString()}`);
  },
};

// Types (aligned with backend contracts)
export interface Transaction {
  id: string;
  merchantId: string;
  environment: 'sandbox' | 'live';
  paypalCaptureId: string;
  paypalOrderId: string;
  merchantOrderReference: string | null;
  invoiceId: string | null;
  status: string;
  amount: { currencyCode: string; value: string };
  capturedAt: string;
  createdAt: string;
  sourceEventId: string;
  order: Order | null;
  orderLink: { status: 'LINKED' | 'UNLINKED' | 'CONFLICT'; reason: string | null };
  readiness: Readiness;
}

export interface Order {
  id: string;
  merchantId: string;
  environment: 'sandbox' | 'live';
  externalId: string;
  paypalOrderId: string;
  sourceKind: 'DEMO' | 'ERP';
  sourceSystem: string;
  currencyCode: string;
  totalAmount: string;
  shippingAmount: string;
  taxAmount: string;
  discountAmount: string;
  orderedAt: string;
  items: OrderItem[];
  contentHash: string;
  createdAt: string;
}

export interface OrderItem {
  sku: string;
  description: string;
  quantity: number;
  unitAmount: string;
}

export interface Readiness {
  status: 'READY' | 'INCOMPLETE' | 'NEEDS_REVIEW';
  basis: string;
  containsDemo: boolean;
  dossierId: string;
  evidenceRevision: number;
  reasons: string[];
  checks: ReadinessCheck[];
}

export interface ReadinessCheck {
  code: string;
  status: 'PRESENT' | 'MISSING' | 'CONFLICT';
  evidenceIds: string[];
}

export interface EvidenceDossier {
  id: string;
  merchantId: string;
  transactionId: string;
  revision: number;
  items: EvidenceItem[];
}

export interface EvidenceItem {
  id: string;
  type: string;
  version: number;
  sourceKind: 'PAYPAL' | 'DEMO' | 'ERP' | 'MERCHANT_UPLOAD';
  sourceSystem: string;
  externalReference: string;
  retrievedAt: string;
  contentHash: string;
  current: boolean;
  integrity: 'VALID' | 'INVALID' | 'UNVERIFIED';
  content: Record<string, unknown>;
}

export interface Dispute {
  id: string;
  merchantId: string;
  paypalDisputeId: string;
  paypalTransactionId: string;
  amount: { currencyCode: string; value: string };
  reason: string;
  status: string;
  stage: string;
  disputeOutcome: string | null;
  createTime: string;
  updateTime: string;
  linkedTransactionId: string | null;
  linkStatus: 'LINKED' | 'UNLINKED' | 'CONFLICT';
  linkReason: string | null;
  internalStatus: 'DETECTED' | 'INVESTIGATING' | 'VERIFYING' | 'INCOMPLETE' | 'REJECTED' | 'APPROVED' | 'READY_TO_SUBMIT' | 'AWAITING_MERCHANT_APPROVAL' | 'SUBMITTING' | 'SUBMITTED' | 'SUBMISSION_FAILED' | 'AWAITING_PAYPAL' | 'CLOSED' | 'NEEDS_REVIEW';
  investigationId: string | null;
  verificationId: string | null;
  submissionId: string | null;
  merchantApproval: boolean | null;
  policy?: {
    allowInvestigations: boolean;
    allowSubmissions: boolean;
    requireMerchantApproval: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  merchantId: string;
  timestamp: string;
  eventType: string;
  actor: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'PARTIAL';
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface ActivityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByOutcome: Record<string, number>;
  avgDurationMs: number;
  errorRate: number;
  topErrors: Array<{ code: string; count: number }>;
}
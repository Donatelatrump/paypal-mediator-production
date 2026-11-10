import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Query keys
export const queryKeys = {
  health: ['health'] as const,
  readiness: ['readiness'] as const,
  me: ['merchant', 'me'] as const,
  integrations: ['integrations'] as const,
  transactions: (params?: { page?: number; pageSize?: number; paypalCaptureId?: string }) =>
    ['transactions', params] as const,
  transaction: (id: string) => ['transaction', id] as const,
  evidence: (id: string) => ['evidence', id] as const,
  disputes: ['disputes'] as const,
  dispute: (id: string) => ['dispute', id] as const,
  activity: (params?: { page?: number; pageSize?: number; merchantId?: string; from?: string; to?: string }) =>
    ['activity', params] as const,
  metrics: (params?: { merchantId?: string; from?: string; to?: string }) =>
    ['metrics', params] as const,
};

// Health
export function useHealth() {
  return useQuery({ queryKey: queryKeys.health, queryFn: api.health });
}

export function useReadiness() {
  return useQuery({ queryKey: queryKeys.readiness, queryFn: api.readiness });
}

// Merchant
export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: api.getMe });
}

export function useUpdateMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

// Integrations
export function useIntegrations() {
  return useQuery({ queryKey: queryKeys.integrations, queryFn: api.getIntegrations });
}

export function useCheckPayPal() {
  return useMutation({ mutationFn: api.checkPayPal });
}

// Transactions
export function useTransactions(params?: { page?: number; pageSize?: number; paypalCaptureId?: string }) {
  return useQuery({ queryKey: queryKeys.transactions(params), queryFn: () => api.listTransactions(params) });
}

export function useTransaction(id: string) {
  return useQuery({ queryKey: queryKeys.transaction(id), queryFn: () => api.getTransaction(id), enabled: !!id });
}

export function useEvidence(id: string) {
  return useQuery({ queryKey: queryKeys.evidence(id), queryFn: () => api.getEvidence(id), enabled: !!id });
}

export function useRefreshEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.refreshEvidence,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evidence(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaction(id) });
    },
  });
}

// Orders
export function useRegisterOrder() {
  return useMutation({ mutationFn: api.registerOrder });
}

// Disputes
export function useDisputes() {
  return useQuery({ queryKey: queryKeys.disputes, queryFn: api.listDisputes });
}

export function useDispute(id: string) {
  return useQuery({ queryKey: queryKeys.dispute(id), queryFn: () => api.getDispute(id), enabled: !!id });
}

export function useInvestigateDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.investigateDispute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.disputes });
    },
  });
}

export function useApproveDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.approveDispute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.disputes });
    },
  });
}

export function useSubmitDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.submitDispute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.disputes });
    },
  });
}

// Activity / Monitoring
export function useActivity(params?: { page?: number; pageSize?: number; merchantId?: string; from?: string; to?: string }) {
  return useQuery({ queryKey: queryKeys.activity(params), queryFn: () => api.getActivity(params) });
}

export function useMetrics(params?: { merchantId?: string; from?: string; to?: string }) {
  return useQuery({ queryKey: queryKeys.metrics(params), queryFn: () => api.getMetrics(params) });
}
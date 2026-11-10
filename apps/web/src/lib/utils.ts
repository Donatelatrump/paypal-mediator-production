import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: string, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(parseFloat(value));
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getReadinessColor(status: string): string {
  switch (status) {
    case 'READY':
      return 'text-green-600 bg-green-100';
    case 'INCOMPLETE':
      return 'text-yellow-600 bg-yellow-100';
    case 'NEEDS_REVIEW':
      return 'text-orange-600 bg-orange-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getStatusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
    case 'READY':
    case 'APPROVED':
    case 'SUBMITTED':
    case 'LINKED':
      return 'text-green-600 bg-green-100';
    case 'INCOMPLETE':
    case 'PENDING':
    case 'IN_TRANSIT':
    case 'INVESTIGATING':
    case 'VERIFYING':
    case 'AWAITING_MERCHANT_APPROVAL':
    case 'SUBMITTING':
      return 'text-yellow-600 bg-yellow-100';
    case 'NEEDS_REVIEW':
    case 'BLOCKED':
    case 'FAILED':
    case 'REJECTED':
    case 'UNLINKED':
    case 'CONFLICT':
    case 'SUBMISSION_FAILED':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getInternalStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DETECTED: 'Detected',
    INVESTIGATING: 'Investigating',
    VERIFYING: 'Verifying',
    INCOMPLETE: 'Incomplete',
    REJECTED: 'Rejected',
    APPROVED: 'Approved',
    READY_TO_SUBMIT: 'Ready to Submit',
    AWAITING_MERCHANT_APPROVAL: 'Awaiting Approval',
    SUBMITTING: 'Submitting',
    SUBMITTED: 'Submitted',
    SUBMISSION_FAILED: 'Submission Failed',
    AWAITING_PAYPAL: 'Awaiting PayPal',
    CLOSED: 'Closed',
    NEEDS_REVIEW: 'Needs Review',
  };
  return labels[status] || status;
}
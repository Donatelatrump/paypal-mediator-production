'use client';

import { useMe, useTransactions, useDisputes, useMetrics } from '@/hooks/useApi';
import { DashboardLayout } from '@/components/DashboardLayout';
import { cn, formatCurrency, formatRelativeTime, getReadinessColor, getStatusColor } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function OverviewPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const { data: transactionsData, isLoading: txLoading } = useTransactions({ pageSize: 5 });
  const { data: disputesData, isLoading: dispLoading } = useDisputes();
  const { data: metrics, isLoading: metricsLoading } = useMetrics();

  if (meLoading || txLoading || dispLoading || metricsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const transactions = transactionsData?.items || [];
  const disputes = disputesData || [];

  const readyCount = transactions.filter((t) => t.readiness.status === 'READY').length;
  const incompleteCount = transactions.filter((t) => t.readiness.status === 'INCOMPLETE').length;
  const needsReviewCount = transactions.filter((t) => t.readiness.status === 'NEEDS_REVIEW').length;

  const openDisputes = disputes.filter(
    (d) => !['CLOSED', 'SUBMITTED'].includes(d.internalStatus)
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">
            Welcome back, {me?.displayName || 'Merchant'}. Here's your dispute readiness summary.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactionsData?.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {readyCount} ready · {incompleteCount} incomplete · {needsReviewCount} needs review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{openDisputes}</div>
              <p className="text-xs text-muted-foreground">
                {disputes.length} total disputes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Readiness Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transactionsData?.total
                  ? Math.round((readyCount / transactionsData.total) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Documents complete</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PayPal Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={me?.integration?.connectionStatus === 'CONNECTED' ? 'default' : 'secondary'}>
                  {me?.integration?.connectionStatus || 'NOT_CONFIGURED'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last checked: {me?.integration?.lastCheckedAt ? formatRelativeTime(me.integration.lastCheckedAt) : 'Never'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="md:col-span-4 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No transactions yet. Connect PayPal to start capturing payments.
                    </p>
                  ) : (
                    transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {tx.order?.externalId || tx.merchantOrderReference || 'Unlinked order'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(tx.amount.value, tx.amount.currencyCode)} ·{' '}
                            {formatRelativeTime(tx.capturedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getReadinessColor(tx.readiness.status)}>
                            {tx.readiness.status}
                          </Badge>
                          <Badge className={getStatusColor(tx.status)}>{tx.status}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Disputes */}
          <div className="md:col-span-2 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Recent Disputes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {disputes.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No disputes yet. Disputes will appear here when buyers open cases in PayPal.
                    </p>
                  ) : (
                    disputes.slice(0, 5).map((dispute) => (
                      <div
                        key={dispute.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {dispute.paypalDisputeId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(dispute.amount.value, dispute.amount.currencyCode)} · {dispute.reason}
                          </p>
                        </div>
                        <Badge className={getStatusColor(dispute.internalStatus)}>
                          {dispute.internalStatus.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <a
                href="/transactions"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                View All Transactions
              </a>
              <a
                href="/disputes"
                className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                View All Disputes
              </a>
              <a
                href="/settings"
                className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Configure PayPal
              </a>
              <a
                href="/activity"
                className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                View Activity Log
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
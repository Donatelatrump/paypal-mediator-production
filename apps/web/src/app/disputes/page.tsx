'use client';

import { useMemo } from 'react';
import { useDisputes, useInvestigateDispute, useApproveDispute, useSubmitDispute } from '@/hooks/useApi';
import { DashboardLayout } from '@/components/DashboardLayout';
import { cn, formatCurrency, formatDate, getStatusColor, getInternalStatusLabel } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChartComponent, BarChartComponent, LineChartComponent } from '@/components/charts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function DisputesPage() {
  const { data: disputesData, isLoading, error, refetch } = useDisputes();
  const investigateMutation = useInvestigateDispute();
  const approveMutation = useApproveDispute();
  const submitMutation = useSubmitDispute();

  const disputes = disputesData || [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-1/4" />
          <Card><CardContent className="py-4"><Skeleton className="h-10 w-1/3" /></CardContent></Card>
          <Card><CardContent className="py-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Failed to load disputes: {error.message}</p>
            <Button onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Chart data
  const statusChartData = useMemo(() => {
    const counts = disputes.reduce((acc, d) => {
      acc[d.internalStatus] = (acc[d.internalStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value], i) => ({ name: getInternalStatusLabel(name), value, color: COLORS[i % COLORS.length] }));
  }, [disputes]);

  const reasonChartData = useMemo(() => {
    const counts = disputes.reduce((acc, d) => {
      acc[d.reason] = (acc[d.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [disputes]);

  const stageChartData = useMemo(() => {
    const counts = disputes.reduce((acc, d) => {
      acc[d.stage] = (acc[d.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [disputes]);

  const monthlyDisputesData = useMemo(() => {
    const monthly = disputes.reduce((acc, d) => {
      const month = new Date(d.disputedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(monthly).slice(-6).map(([month, count]) => ({ month, count }));
  }, [disputes]);

  const amountByStatusData = useMemo(() => {
    const amounts = disputes.reduce((acc, d) => {
      const status = getInternalStatusLabel(d.internalStatus);
      acc[status] = (acc[status] || 0) + parseFloat(d.amount.value);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(amounts).map(([status, amount], i) => ({ status, amount, color: COLORS[i % COLORS.length] }));
  }, [disputes]);

  const openDisputes = disputes.filter(
    (d) => !['CLOSED', 'SUBMITTED'].includes(d.internalStatus)
  ).length;

  const totalDisputedAmount = disputes.reduce((sum, d) => sum + parseFloat(d.amount.value), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Disputes</h1>
          <p className="text-muted-foreground">
            Manage PayPal disputes and coordinate evidence submission.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{disputes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{openDisputes}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Disputed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalDisputedAmount, 'USD')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Dispute Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(disputes.length ? totalDisputedAmount / disputes.length : 0, 'USD')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {disputes.filter(d => d.internalStatus === 'SUBMITTED' || d.internalStatus === 'CLOSED').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Disputes by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartComponent data={statusChartData} title="Disputes by Status" height={256} />
            </CardContent>
          </Card>

          {/* Dispute Reasons */}
          <Card>
            <CardHeader>
              <CardTitle>Dispute Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartComponent data={reasonChartData} title="Dispute Reasons" height={256} />
            </CardContent>
          </Card>

          {/* PayPal Stages */}
          <Card>
            <CardHeader>
              <CardTitle>PayPal Stages</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartComponent data={stageChartData} title="PayPal Stages" height={256} />
            </CardContent>
          </Card>
        </div>

        {/* Amount by Status & Monthly Trend */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Disputed Amount by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartComponent
                data={amountByStatusData}
                dataKey="amount"
                nameKey="status"
                title="Disputed Amount by Status"
                height={256}
                formatter={(value: number) => [formatCurrency(value, 'USD'), 'Amount']}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disputes per Month (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChartComponent
                data={monthlyDisputesData}
                xKey="month"
                yKey="count"
                title="Disputes per Month (Last 6 Months)"
                height={256}
                stroke="#ef4444"
              />
            </CardContent>
          </Card>
        </div>

        {/* Disputes List */}
        <Card>
          <CardHeader>
            <CardTitle>{disputes.length} disputes</CardTitle>
          </CardHeader>
          <CardContent>
            {disputes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No disputes yet. Disputes will appear here when buyers open cases in PayPal.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {disputes.map((dispute) => (
                  <div key={dispute.id} className="border border-border rounded-lg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="font-medium">{dispute.paypalDisputeId}</p>
                          <Badge className={getStatusColor(dispute.internalStatus)}>
                            {getInternalStatusLabel(dispute.internalStatus)}
                          </Badge>
                          <Badge className={getStatusColor(dispute.linkStatus)}>Link: {dispute.linkStatus}</Badge>
                          <Badge variant="secondary">{dispute.stage}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatCurrency(dispute.amount.value, dispute.amount.currencyCode)}</span>
                          <span>{dispute.reason}</span>
                          <span>Created: {formatDate(dispute.createTime)}</span>
                          <span>Stage: {dispute.stage}</span>
                          {dispute.deadlineAt && (
                            <span className={new Date(dispute.deadlineAt) < new Date() ? 'text-destructive' : 'text-amber-600'}>
                              Deadline: {formatDate(dispute.deadlineAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {dispute.internalStatus === 'DETECTED' || dispute.internalStatus === 'INCOMPLETE' || dispute.internalStatus === 'NEEDS_REVIEW' ? (
                          <Button
                            size="sm"
                            onClick={() => investigateMutation.mutate(dispute.id)}
                            disabled={investigateMutation.isPending}
                          >
                            Investigate
                          </Button>
                        ) : null}
                        {dispute.internalStatus === 'APPROVED' || dispute.internalStatus === 'READY_TO_SUBMIT' ? (
                          <>
                            {dispute.merchantApproval === null && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveMutation.mutate(dispute.id)}
                                disabled={approveMutation.isPending}
                              >
                                Approve
                              </Button>
                            )}
                            {(dispute.merchantApproval === true || !dispute.policy?.requireMerchantApproval) && (
                              <Button
                                size="sm"
                                onClick={() => submitMutation.mutate(dispute.id)}
                                disabled={submitMutation.isPending}
                              >
                                Submit Evidence
                              </Button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
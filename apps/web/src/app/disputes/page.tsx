'use client';

import { useDisputes, useInvestigateDispute, useApproveDispute, useSubmitDispute } from '@/hooks/useApi';
import { DashboardLayout } from '@/components/DashboardLayout';
import { cn, formatCurrency, formatDate, getStatusColor, getInternalStatusLabel } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DisputesPage() {
  const { data: disputesData, isLoading, error, refetch } = useDisputes();
  const investigateMutation = useInvestigateDispute();
  const approveMutation = useApproveDispute();
  const submitMutation = useSubmitDispute();

  const disputes = disputesData || [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Disputes</h1>
          <p className="text-muted-foreground">
            Manage PayPal disputes and coordinate evidence submission.
          </p>
        </div>

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
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatCurrency(dispute.amount.value, dispute.amount.currencyCode)}</span>
                          <span>{dispute.reason}</span>
                          <span>Created: {formatDate(dispute.createTime)}</span>
                          <span>Stage: {dispute.stage}</span>
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
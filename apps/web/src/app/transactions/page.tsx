'use client';

import { useState } from 'react';
import { useTransactions, useRefreshEvidence } from '@/hooks/useApi';
import { DashboardLayout } from '@/components/DashboardLayout';
import { cn, formatCurrency, formatDate, getReadinessColor, getStatusColor } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'INCOMPLETE' | 'NEEDS_REVIEW'>('ALL');

  const { data, isLoading, error, refetch } = useTransactions({
    page,
    pageSize,
    paypalCaptureId: search || undefined,
  });

  const refreshMutation = useRefreshEvidence();

  const filteredTransactions = data?.items.filter((tx) => {
    if (statusFilter === 'ALL') return true;
    return tx.readiness.status === statusFilter;
  }) || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

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
            <p className="text-destructive">Failed to load transactions: {error.message}</p>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              Monitor payment captures and their dispute readiness.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[250px]">
                <input
                  type="text"
                  placeholder="Search by capture ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'ALL' | 'READY' | 'INCOMPLETE' | 'NEEDS_REVIEW')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="READY">Ready</SelectItem>
                  <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
                  <SelectItem value="NEEDS_REVIEW">Needs review</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit">Filter</Button>
            </form>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {data?.total || 0} transactions
              {data && data.total > data.items.length && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (showing {data.items.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No transactions found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-medium">Order</th>
                      <th className="text-left p-4 font-medium">Payment Received</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Payment Status</th>
                      <th className="text-left p-4 font-medium">Readiness</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-border hover:bg-accent/50">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">
                              {tx.order?.externalId || tx.merchantOrderReference || 'Unlinked order'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {tx.order
                                ? `${tx.order.items.reduce((sum, item) => sum + item.quantity, 0)} items`
                                : 'Items unavailable'}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">{formatDate(tx.capturedAt)}</td>
                        <td className="p-4 font-medium">
                          {formatCurrency(tx.amount.value, tx.amount.currencyCode)}
                        </td>
                        <td className="p-4">
                          <Badge className={getStatusColor(tx.status)}>{tx.status}</Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={getReadinessColor(tx.readiness.status)}>
                            {tx.readiness.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => refreshMutation.mutate(tx.id)}
                              disabled={refreshMutation.isPending}
                            >
                              Refresh
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {data && data.total > pageSize && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {Math.ceil(data.total / pageSize)}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(Math.ceil(data.total / pageSize), p + 1))}
                    disabled={page >= Math.ceil(data.total / pageSize)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
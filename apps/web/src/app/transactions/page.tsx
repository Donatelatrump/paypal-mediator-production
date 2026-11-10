'use client';

import { useState, useMemo } from 'react';
import { useTransactions, useRefreshEvidence } from '@/hooks/useApi';
import { DashboardLayout } from '@/components/DashboardLayout';
import { cn, formatCurrency, formatDate, getReadinessColor, getStatusColor } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'INCOMPLETE' | 'NEEDS_REVIEW'>('ALL');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { data, isLoading, error, refetch } = useTransactions({
    page,
    pageSize,
    paypalCaptureId: search || undefined,
  });

  const refreshMutation = useRefreshEvidence();

  const filteredTransactions = useMemo(() => {
    return data?.items.filter((tx) => {
      if (statusFilter !== 'ALL' && tx.readiness.status !== statusFilter) return false;
      if (dateRange.from && new Date(tx.capturedAt) < dateRange.from) return false;
      if (dateRange.to && new Date(tx.capturedAt) > dateRange.to) return false;
      return true;
    }) || [];
  }, [data?.items, statusFilter, dateRange]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  // Chart data
  const readinessChartData = useMemo(() => {
    const counts = filteredTransactions.reduce((acc, tx) => {
      acc[tx.readiness.status] = (acc[tx.readiness.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [filteredTransactions]);

  const statusChartData = useMemo(() => {
    const counts = filteredTransactions.reduce((acc, tx) => {
      acc[tx.status] = (acc[tx.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [filteredTransactions]);

  const dailyVolumeData = useMemo(() => {
    const daily = filteredTransactions.reduce((acc, tx) => {
      const day = new Date(tx.capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      acc[day] = (acc[day] || 0) + parseFloat(tx.amount.value);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(daily).slice(-14).map(([day, volume]) => ({ day, volume }));
  }, [filteredTransactions]);

  const currencyData = useMemo(() => {
    const curr = filteredTransactions.reduce((acc, tx) => {
      acc[tx.amount.currencyCode] = (acc[tx.amount.currencyCode] || 0) + parseFloat(tx.amount.value);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(curr).map(([currency, volume], i) => ({ currency, volume, color: COLORS[i % COLORS.length] }));
  }, [filteredTransactions]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-1/4" />
          <Card><CardContent className="py-4"><Skeleton className="h-10 w-1/3" /></CardContent></Card>
          <Card><CardContent className="py-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
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
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              Monitor payment captures and their dispute readiness.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Showing {filteredTransactions.length} filtered</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  filteredTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount.value), 0),
                  'USD'
                )}
              </div>
              <p className="text-xs text-muted-foreground">Filtered transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredTransactions.length
                  ? Math.round((filteredTransactions.filter(t => t.readiness.status === 'READY').length / filteredTransactions.length) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Dispute ready</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  filteredTransactions.length
                    ? filteredTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount.value), 0) / filteredTransactions.length
                    : 0,
                  'USD'
                )}
              </div>
              <p className="text-xs text-muted-foreground">Average value</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Readiness Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Readiness Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={readinessChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {readinessChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value.toString(), 'transactions']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value.toString(), 'transactions']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Currency Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>By Currency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="currency" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value, 'USD'), 'Volume']} />
                    <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Volume Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Volume (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [formatCurrency(value, 'USD'), 'Volume']} />
                  <Line type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Card>

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
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">From:</label>
                <Input type="date" value={dateRange.from?.toISOString().split('T')[0] || ''} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value ? new Date(e.target.value) : undefined })} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">To:</label>
                <Input type="date" value={dateRange.to?.toISOString().split('T')[0] || ''} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value ? new Date(e.target.value) : undefined })} />
              </div>
              <Button type="submit">Filter</Button>
              <Button type="button" variant="outline" onClick={() => { setSearch(''); setStatusFilter('ALL'); setDateRange({}); setPage(1); refetch(); }}>
                Clear
              </Button>
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
                      <th className="text-left p-4 font-medium">Currency</th>
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
                          <Badge variant="secondary">{tx.amount.currencyCode}</Badge>
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
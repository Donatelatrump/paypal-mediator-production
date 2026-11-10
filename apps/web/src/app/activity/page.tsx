'use client';

import { useState, useMemo } from 'react';
import { useActivity, useMetrics } from '@/hooks/useApi';
import { DashboardLayout } from '@/components/DashboardLayout';
import { cn, formatDate, getStatusColor } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PieChartComponent, BarChartComponent, LineChartComponent } from '@/components/charts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const { data: activityData, isLoading: activityLoading, refetch: refetchActivity } = useActivity({ page, pageSize });
  const { data: metrics, isLoading: metricsLoading } = useMetrics();

  if (activityLoading || metricsLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-1/4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="py-6"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-3/4 mt-2" /></CardContent></Card>
            ))}
          </div>
          <Card><CardContent className="py-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card><CardContent className="py-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  const filteredEvents = useMemo(() => {
    return activityData?.items.filter((event) => {
      if (typeFilter !== 'ALL' && event.eventType !== typeFilter) return false;
      if (dateRange.from && new Date(event.timestamp) < dateRange.from) return false;
      if (dateRange.to && new Date(event.timestamp) > dateRange.to) return false;
      return true;
    }) || [];
  }, [activityData?.items, typeFilter, dateRange]);

  // Chart data
  const eventsByTypeData = useMemo(() => {
    const counts = filteredEvents.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [filteredEvents]);

  const eventsByOutcomeData = useMemo(() => {
    const counts = filteredEvents.reduce((acc, event) => {
      acc[event.outcome] = (acc[event.outcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [filteredEvents]);

  const hourlyVolumeData = useMemo(() => {
    const hourly = filteredEvents.reduce((acc, event) => {
      const hour = new Date(event.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(hourly).slice(-24).map(([hour, count]) => ({ hour, count }));
  }, [filteredEvents]);

  const dailyVolumeData = useMemo(() => {
    const daily = filteredEvents.reduce((acc, event) => {
      const day = new Date(event.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(daily).slice(-14).map(([day, count]) => ({ day, count }));
  }, [filteredEvents]);

  const actorData = useMemo(() => {
    const actors = filteredEvents.reduce((acc, event) => {
      acc[event.actor] = (acc[event.actor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(actors).map(([actor, count], i) => ({ actor, count, color: COLORS[i % COLORS.length] }));
  }, [filteredEvents]);

  const avgDurationByTypeData = useMemo(() => {
    const durations = filteredEvents.reduce((acc, event) => {
      if (event.durationMs !== null) {
        if (!acc[event.eventType]) {
          acc[event.eventType] = { total: 0, count: 0 };
        }
        acc[event.eventType].total += event.durationMs;
        acc[event.eventType].count += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; count: number }>);
    return Object.entries(durations).map(([type, data]) => ({ type, avgDuration: data.total / data.count }));
  }, [filteredEvents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetchActivity();
  };

  const eventTypes = Array.from(new Set(activityData?.items.map(e => e.eventType) || [])).sort();

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Activity</h1>
          <p className="text-muted-foreground">
            Audit trail of all agent operations, webhook processing, and system events.
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalEvents || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.avgDurationMs || 0}ms</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {(metrics?.errorRate || 0).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics ? (100 - (metrics.errorRate || 0)).toFixed(1) : 100}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Filtered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredEvents.length}</div>
              <p className="text-xs text-muted-foreground">of {activityData?.total || 0} total</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All event types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All event types</SelectItem>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">From:</label>
                <input
                  type="date"
                  value={dateRange.from?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-auto px-2 py-1 border border-input rounded-lg bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">To:</label>
                <input
                  type="date"
                  value={dateRange.to?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-auto px-2 py-1 border border-input rounded-lg bg-background"
                />
              </div>
              <Button type="submit">Filter</Button>
              <Button type="button" variant="outline" onClick={() => { setTypeFilter('ALL'); setDateRange({}); setPage(1); refetchActivity(); }}>
                Clear
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Charts Row 1 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Events by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartComponent data={eventsByTypeData} title="Events by Type" height={256} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Events by Outcome</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartComponent data={eventsByOutcomeData} title="Events by Outcome" height={256} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Events by Actor</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartComponent
                data={actorData}
                dataKey="count"
                nameKey="actor"
                title="Events by Actor"
                height={256}
                layout="vertical"
              />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Events Over Time (Last 14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChartComponent
                data={dailyVolumeData}
                xKey="day"
                yKey="count"
                title="Events Over Time (Last 14 Days)"
                height={256}
                type="area"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hourly Distribution (Last 24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartComponent
                data={hourlyVolumeData}
                dataKey="count"
                nameKey="hour"
                title="Hourly Distribution (Last 24h)"
                height={256}
                layout="vertical"
              />
            </CardContent>
          </Card>
        </div>

        {/* Avg Duration by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Average Duration by Event Type</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={avgDurationByTypeData}
              dataKey="avgDuration"
              nameKey="type"
              title="Average Duration by Event Type"
              height={256}
              formatter={(value: number) => [`${value}ms`, 'avg duration']}
            />
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity ({activityData?.total || 0} total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-medium">Timestamp</th>
                    <th className="text-left p-4 font-medium">Event Type</th>
                    <th className="text-left p-4 font-medium">Actor</th>
                    <th className="text-left p-4 font-medium">Action</th>
                    <th className="text-left p-4 font-medium">Outcome</th>
                    <th className="text-left p-4 font-medium">Entity</th>
                    <th className="text-left p-4 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="border-b border-border hover:bg-accent/50">
                      <td className="p-4 text-sm">{formatDate(event.timestamp)}</td>
                      <td className="p-4">
                        <Badge variant="secondary">{event.eventType}</Badge>
                      </td>
                      <td className="p-4 text-sm">{event.actor}</td>
                      <td className="p-4 text-sm">{event.action}</td>
                      <td className="p-4">
                        <Badge className={getStatusColor(event.outcome)}>{event.outcome}</Badge>
                      </td>
                      <td className="p-4 text-sm">
                        {event.entityType}: {event.entityId.slice(0, 12)}...
                      </td>
                      <td className="p-4 text-sm">
                        {event.durationMs ? `${event.durationMs}ms` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {activityData && activityData.total > pageSize && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {Math.ceil(activityData.total / pageSize)}
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
                    onClick={() => setPage((p) => Math.min(Math.ceil(activityData.total / pageSize), p + 1))}
                    disabled={page >= Math.ceil(activityData.total / pageSize)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Errors */}
        {metrics?.topErrors && metrics.topErrors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.topErrors.map((error, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-destructive">{error.code}</p>
                      <p className="text-sm text-muted-foreground">{error.count} occurrences</p>
                    </div>
                    <Badge variant="destructive">{error.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Events by Type Detail */}
        {metrics?.eventsByType && (
          <Card>
            <CardHeader>
              <CardTitle>Events by Type (All Time)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                {Object.entries(metrics.eventsByType).map(([type, count]) => (
                  <div key={type} className="p-3 rounded-lg border border-border">
                    <p className="font-medium text-sm">{type}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Events by Outcome Detail */}
        {metrics?.eventsByOutcome && (
          <Card>
            <CardHeader>
              <CardTitle>Events by Outcome (All Time)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                {Object.entries(metrics.eventsByOutcome).map(([outcome, count]) => (
                  <div key={outcome} className="p-3 rounded-lg border border-border">
                    <p className="font-medium">{outcome}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
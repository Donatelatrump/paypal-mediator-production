'use client';

import { useState } from 'react';
import { useActivity, useMetrics } from '@/hooks/useApi';
import { DashboardLayout } from '@/components/DashboardLayout';
import { cn, formatDate, getStatusColor } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const { data: activityData, isLoading: activityLoading, refetch: refetchActivity } = useActivity({ page, pageSize });
  const { data: metrics, isLoading: metricsLoading } = useMetrics();

  if (activityLoading || metricsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Activity</h1>
          <p className="text-muted-foreground">
            Audit trail of all agent operations, webhook processing, and system events.
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        </div>

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
                  {activityData?.items.map((event) => (
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

        {/* Events by Type */}
        {metrics?.eventsByType && (
          <Card>
            <CardHeader>
              <CardTitle>Events by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                {Object.entries(metrics.eventsByType).map(([type, count]) => (
                  <div key={type} className="p-3 rounded-lg border border-border">
                    <p className="font-medium">{type}</p>
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
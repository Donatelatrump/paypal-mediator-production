'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';

interface LineChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  title?: string;
  height?: number;
  stroke?: string;
  fill?: string;
  type?: 'line' | 'area';
  formatter?: (value: number) => [string, string];
}

export function LineChartComponent({ data, xKey, yKey, title, height = 300, stroke = '#3b82f6', fill, type = 'line', formatter }: LineChartProps) {
  if (!data.length) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>;
  }

  return (
    <div className={`h-${height / 4}`}>
      {title && <h4 className="mb-4 text-center">{title}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        {type === 'area' ? (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stroke} stopOpacity={0.3} />
                <stop offset="95%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip formatter={formatter || ((value: number) => [value.toString(), 'value'])} />
            <Area type="monotone" dataKey={yKey} stroke={stroke} fill="url(#colorArea)" strokeWidth={2} />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip formatter={formatter || ((value: number) => [value.toString(), 'value'])} />
            <Line type="monotone" dataKey={yKey} stroke={stroke} strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
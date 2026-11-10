'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface BarChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  dataKey: string;
  nameKey: string;
  title?: string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
  formatter?: (value: number) => [string, string];
}

export function BarChartComponent({ data, dataKey, nameKey, title, height = 300, layout = 'horizontal', formatter }: BarChartProps) {
  if (!data.length) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>;
  }

  return (
    <div className={`h-${height / 4}`}>
      {title && <h4 className="mb-4 text-center">{title}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={layout}>
          <CartesianGrid strokeDasharray="3 3" />
          {layout === 'horizontal' ? (
            <>
              <XAxis dataKey={nameKey} />
              <YAxis />
            </>
          ) : (
            <>
              <XAxis type="number" />
              <YAxis dataKey={nameKey} type="category" width={120} />
            </>
          )}
          <Tooltip formatter={formatter || ((value: number) => [value.toString(), 'items'])} />
          <Bar dataKey={dataKey} fill="#3b82f6" radius={layout === 'horizontal' ? [4, 4, 0, 0] : [0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
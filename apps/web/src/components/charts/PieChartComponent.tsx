'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface PieChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  title?: string;
  height?: number;
}

export function PieChartComponent({ data, title, height = 300 }: PieChartComponentProps) {
  if (!data.length) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>;
  }

  return (
    <div className={`h-${height / 4}`}>
      {title && <h4 className="mb-4 text-center">{title}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [value.toString(), 'items']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface ChartData {
  name: string;
  revenue: number;
}

export function DashboardChart({ data }: { data?: ChartData[] }) {
  const chartData = data || [];

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No revenue data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="name"
          stroke="#000000"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#000000"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `SAR ${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
          itemStyle={{ color: "var(--foreground)" }}
          labelStyle={{ color: "var(--foreground)" }}
          formatter={(value: number) => [`SAR ${value.toFixed(2)}`, "Revenue"]}
        />
        <Bar
          dataKey="revenue"
          fill="var(--chart-1)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

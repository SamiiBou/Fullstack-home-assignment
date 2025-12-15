import React from "react";
import { PieChart, Pie, Tooltip, ResponsiveContainer } from "recharts";
import { useUsdtTopSenders } from "../hooks/useUsdtTopSenders";

type Props = {
  start: number;
  end: number;
};

export function TopSendersPieChartCard({ start, end }: Props) {
  const { data, isLoading, error } = useUsdtTopSenders(start, end);

  console.log('Senders Hook state:', { data, isLoading, error });

  if (isLoading) return <div className="p-8">We are loading the data (Top senders by volume), this may take up to 5 min, please wait</div>;
  if (error) return <div className="p-8">Error: {error.message}</div>;

  const chartData =
    data?.map((s) => ({
      name: s.label,
      value: parseFloat(s.amountUsdt),
    })) ?? [];

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-3">USDT Top Senders</h2>

      <ResponsiveContainer width="100%" height={420}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={140} label />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

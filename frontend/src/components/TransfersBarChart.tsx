import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useUsdtTransfers } from "../hooks/useUsdtTransfers";

type Props = {
  start: number;
  end: number;
};

export function TransfersBarChartCard({ start, end }: Props) {
  const { data, isLoading, error } = useUsdtTransfers(start, end);

  console.log('Transfer Hook state:', { data, isLoading, error });


  if (isLoading) return <div className="p-8">We are loading the data (usdt volume transfers), this may take up to 5 min, please wait</div>;
  if (error) return <div className="p-8">Error: {error.message}</div>;
  if (!data) return <div className="p-8">We are loading the data, this may take up to 5 min, please wait</div>;

  console.log("timestamp to real time", new Date(data[1].bucketStart*1000).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }));

  const chartData =
    data?.map((d) => ({
      time: new Date(d.bucketStart * 1000).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      volume: Number.parseFloat(d.volumeUsdt),
    })) ?? [];

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-3">USDT Transfers (30m buckets)</h2>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <XAxis dataKey="time" angle={-45} textAnchor="end" height={60} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="volume" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}



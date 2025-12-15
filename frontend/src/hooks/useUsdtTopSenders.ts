import { useQuery } from "@tanstack/react-query";

export interface TopSenderSlice {
  label: string;        
  address?: string;     
  amountRaw: string;
  amountUsdt: string;
}

export function useUsdtTopSenders(start: number, end: number) {
  return useQuery({
    queryKey: ["usdtTopSenders", start, end],
    queryFn: async (): Promise<TopSenderSlice[]> => {
      const res = await fetch(
        `http://localhost:3001/api/usdt/top-senders?start=${start}&end=${end}`
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const json = await res.json();
      return json.data;
    },
  });
}

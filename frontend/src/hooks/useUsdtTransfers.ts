import { useQuery } from "@tanstack/react-query";

export interface TransferBucket {
    bucketStart: number;
    volumeRaw: string;
    volumeUsdt: string;
  }

  export function useUsdtTransfers(start: number, end: number) {
    return useQuery({
      queryKey: ["usdtTransfers", start, end],
      queryFn: async (): Promise<TransferBucket[]> => {
        const res = await fetch(
          `http://localhost:3001/api/usdt/transfers/30m?start=${start}&end=${end}`
        );
        const json = await res.json();
        return json.data;
      },
    });
  }
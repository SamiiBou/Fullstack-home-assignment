import { Request, Response } from "express";
import { fetchDataByTimeStamp } from "../services/fetchDataByTimestamp";
import { provider } from "../config/ethereum";

const fetcher = new fetchDataByTimeStamp();

function parseStringToNumber(value: unknown): number | null {
    if (typeof value !== "string") return null;
    const n = Number(value);
    return n;
  }

  export async function getUsdtTransfers30m(req: Request, res: Response) {
    const startTime = parseStringToNumber(req.query.start);
    const endTime = parseStringToNumber(req.query.end);
    
    if (startTime === null || endTime === null) {
      return res.status(400).json({ error: "Invalid or missing 'start' or 'end' query parameters" });
    }

    try {
        const data = await fetcher.getTransferUsdtPerThirtyMinutes(provider, startTime, endTime);
        return res.json({
          startTimestamp: startTime,
          endTimestamp: endTime,
          data,
        });
      } catch (err) {
        console.error("getUsdtTransfers30m error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
  }
import { Router } from "express";
import { getUsdtTransfers30m } from "../controller/transferUsdtController";

const router = Router();
router.get("/transfers/30m", getUsdtTransfers30m);


export default router;
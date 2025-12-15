import { Router } from "express";
import { getUsdtTopSenders } from "../controller/usdtTopSendersController";

const router = Router();

router.get("/top-senders", getUsdtTopSenders);

export default router;

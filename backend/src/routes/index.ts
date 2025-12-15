import { Router } from "express";
import transferUsdtRoutes from "./transferUsdtRoutes";

const router = Router();

router.use("/usdt", transferUsdtRoutes);

export default router;

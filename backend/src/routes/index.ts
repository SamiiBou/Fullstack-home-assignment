import { Router } from "express";
import transferUsdtRoutes from "./transferUsdtRoutes";
import topSendersUsdtRoutes from "./topSendersUsdtRoutes";


const router = Router();

router.use("/usdt", transferUsdtRoutes);
router.use("/usdt", topSendersUsdtRoutes);


export default router;

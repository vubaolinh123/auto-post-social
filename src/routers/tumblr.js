import { Router } from "express";
import { getToken, requestToken, schedulePostTumblr, scheduleTumblr } from "../controllers/tumblr";
const router = Router();

router.post('/tumblr/post-images/:blogIdentifier', schedulePostTumblr);
router.get('/auth/tumblr', requestToken);
router.get('/auth/tumblr/callback', getToken);

export default router;

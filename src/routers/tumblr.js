import { Router } from "express";
import { getToken, requestToken, schedulePostTumblr,  } from "../controllers/tumblr";
const router = Router();

// router.post('/tumblr/post-images', postScheduledTumblr);
router.post("/tumblr/post-tumblr", schedulePostTumblr)
router.get('/auth/tumblr', requestToken);
router.get('/auth/tumblr/callback', getToken);

export default router;

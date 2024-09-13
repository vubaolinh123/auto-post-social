import { Router } from "express";
import { deleteTumblr, getToken, getTumblrById, listAllTumblrs, requestToken, schedulePostTumblr, updateTumblr, refreshToken  } from "../controllers/tumblr";
const router = Router();

router.get('/tumblr', listAllTumblrs);
router.get('/tumblr/:id', getTumblrById);
router.delete('/tumblr/:id', deleteTumblr);
router.put('/tumblr/:id', updateTumblr);
router.post("/tumblr/post-tumblr", schedulePostTumblr)
router.get('/auth/tumblr', requestToken);
router.get('/auth/tumblr/callback', getToken);
router.post('/auth/tumblr/refresh-token', refreshToken);

export default router;

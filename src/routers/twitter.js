import { Router } from 'express';
import passport from 'passport';
import { TokenTwitter, listDataScheduleTwitter, scheduleTwitter, getOneDataScheduleTwitter, updateDataScheduleTwitter, deleteDataScheduleTwitter } from '../controllers/twitter';
const router = Router()

router.put("/update-tweet/:id", updateDataScheduleTwitter)
router.delete("/delete-tweet/:id", deleteDataScheduleTwitter)
router.post("/post-tweet", scheduleTwitter)
router.post('/twitter/token',TokenTwitter)
router.get("/list-tweet", listDataScheduleTwitter)
router.get("/get-tweet/:id", getOneDataScheduleTwitter)
router.get('/auth/twitter', passport.authenticate('twitter'));
router.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
});


export default router;
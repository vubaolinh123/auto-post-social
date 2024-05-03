import { Router } from "express";
const passport = require("passport");
import { callBackFacebook, errorFacebook, getTokenFacebook, signOutFacebook, successFacebook } from "../controllers/facebook";
const router = Router();


router.get('/auth/facebook/token/:token', successFacebook);
router.get('/auth/facebook/error', errorFacebook);
router.get('/auth/facebook/signout', signOutFacebook);
router.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'pages_show_list'] }));
router.get('/auth/facebook/callback',   
passport.authenticate('facebook', { failureRedirect: '/api/auth/facebook/error' }),(req, res) => {
    if (!req.user) {
      return res.status(401).send('User not authenticated');
    }
    res.redirect('/api/auth/facebook/token/' + req.user.accessToken);
});

export default router;

const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/facebookUser");
require("dotenv").config();

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "displayName", "photos", "email"],
    },
    (accessToken, refreshToken, profile, done) => {
        console.log("accessTokenFB:", accessToken)
      return done(null, { profile: profile, accessToken: accessToken });
    }
  )
);

exports.isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/api/auth/facebook');
  };


export const successFacebook = async (req, res) => {
    res.send({ accessToken: req.params.token });
};

export const errorFacebook = async (req, res) => {
  res.send("Error logging in via Facebook..");
};

export const signOutFacebook = async (req, res) => {
  try {
    req.session.destroy(function (err) {
      console.log("session destroyed.");
    });
    res.render("auth");
  } catch (err) {
    res.status(400).send({ message: "Failed to sign out fb user" });
  }
};

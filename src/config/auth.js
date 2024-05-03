const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
require('dotenv').config();
const TwitterStrategy = require('passport-twitter').Strategy;

module.exports = function(passport) {
  passport.use(new TwitterStrategy({
      consumerKey: process.env.API_KEY,
      consumerSecret: process.env.API_KEY_SECRET,
      callbackURL: "http://127.0.0.1:3000/auth/twitter/callback"
    },
    function(token, tokenSecret, profile, cb) {
      return cb(null, profile);
    }
  ));
};



